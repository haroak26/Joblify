import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import { storage } from "./storage";
import { normalizePlan } from "@shared/schema";

type PlanName = "plus" | "ultra" | "lifetime";

const PRICE_ID_TO_PLAN = new Map<string, PlanName>();
if (process.env.STRIPE_PLUS_PRICE_ID) {
  PRICE_ID_TO_PLAN.set(process.env.STRIPE_PLUS_PRICE_ID, "plus");
}
if (process.env.STRIPE_ULTRA_PRICE_ID) {
  PRICE_ID_TO_PLAN.set(process.env.STRIPE_ULTRA_PRICE_ID, "ultra");
}
if (process.env.STRIPE_LIFETIME_PRICE_ID) {
  PRICE_ID_TO_PLAN.set(process.env.STRIPE_LIFETIME_PRICE_ID, "lifetime");
}

export function resolvePlanFromPrice(priceId?: string | null): PlanName | undefined {
  if (!priceId) return undefined;
  return PRICE_ID_TO_PLAN.get(priceId);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET not configured");
      }

      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);
      throw error;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = normalizePlan(session.metadata?.plan);
        if (userId && plan !== "free") {
          const existingSubscription = await storage.getSubscription(userId);
          const existingStripeSubscriptionId = existingSubscription?.stripeSubscriptionId;
          const newStripeSubscriptionId = plan === "lifetime"
            ? null
            : typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

          if (
            existingStripeSubscriptionId &&
            (plan === "lifetime" || (newStripeSubscriptionId && existingStripeSubscriptionId !== newStripeSubscriptionId))
          ) {
            try {
              const stripe = await getUncachableStripeClient();
              await stripe.subscriptions.cancel(existingStripeSubscriptionId);
            } catch (error) {
              console.warn("Stripe subscription cancel error:", error);
            }
          }

          await storage.updateSubscription(userId, {
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId: newStripeSubscriptionId,
            status: "active",
            plan,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : undefined;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = resolvePlanFromPrice(priceId);

        if (customerId && plan) {
          const existing = await storage.getSubscriptionByCustomerId(customerId);
          if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== subscription.id) {
            break;
          }
          if (existing?.plan === "lifetime" && !existing.stripeSubscriptionId) {
            break;
          }
          if (existing) {
            const periodEnd = (subscription as { current_period_end?: number }).current_period_end;
            await storage.updateSubscription(existing.userId, {
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              plan,
              currentPeriodEnd: periodEnd
                ? new Date(periodEnd * 1000)
                : undefined,
              renewalReminderSent: false,
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : undefined;
        if (customerId) {
          const existing = await storage.getSubscriptionByCustomerId(customerId);
          if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== subscription.id) {
            break;
          }
          if (existing?.plan === "lifetime" && !existing.stripeSubscriptionId) {
            break;
          }
          if (existing) {
            await storage.updateSubscription(existing.userId, {
              status: "cancelled",
              plan: "free",
              stripeSubscriptionId: null,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  }
}
