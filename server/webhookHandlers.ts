import Stripe from "stripe";
import { getStripeSync } from "./stripeClient";
import { getUncachableStripeClient } from "./stripeClient";
import { storage } from "./storage";

const PRICE_ID_TO_PLAN = new Map<string, "plus" | "ultra">();
if (process.env.STRIPE_PLUS_PRICE_ID) {
  PRICE_ID_TO_PLAN.set(process.env.STRIPE_PLUS_PRICE_ID, "plus");
}
if (process.env.STRIPE_ULTRA_PRICE_ID) {
  PRICE_ID_TO_PLAN.set(process.env.STRIPE_ULTRA_PRICE_ID, "ultra");
}

function resolvePlanFromPrice(priceId?: string | null): "plus" | "ultra" | undefined {
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

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return;
    }

    const stripe = await getUncachableStripeClient();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as "plus" | "ultra" | undefined;
        if (userId) {
          await storage.updateSubscription(userId, {
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
            status: "active",
            plan: plan || "plus",
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
          if (existing) {
            await storage.updateSubscription(existing.userId, {
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              plan,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : undefined,
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
