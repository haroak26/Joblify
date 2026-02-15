import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers, resolvePlanFromPrice } from "./webhookHandlers";
import { normalizePlan } from "@shared/schema";

const PLUS_PRICE_ID = process.env.STRIPE_PLUS_PRICE_ID || "";
const ULTRA_PRICE_ID = process.env.STRIPE_ULTRA_PRICE_ID || "";
const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || "";

function resolveAppUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) {
    return origin;
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string"
    ? forwardedProto.split(",")[0]
    : req.secure
    ? "https"
    : "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  if (host) {
    return `${protocol}://${host}`;
  }

  return "http://localhost:5000";
}

export async function setupStripeRoutes(app: Express) {
  try {
    await getUncachableStripeClient();
    console.log("Stripe configured");
  } catch (error) {
    console.log("Stripe not configured - payment features disabled");
    return;
  }

  app.post("/api/stripe/create-checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      const requestedPlan = typeof req.body?.plan === "string" ? req.body.plan : "plus";
      const normalizedPlan = normalizePlan(requestedPlan);
      const plan = normalizedPlan === "ultra" || normalizedPlan === "lifetime" || normalizedPlan === "plus"
        ? normalizedPlan
        : "plus";
      const priceId = plan === "ultra" ? ULTRA_PRICE_ID : plan === "lifetime" ? LIFETIME_PRICE_ID : PLUS_PRICE_ID;
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!priceId) {
        return res.status(400).json({ error: "Stripe price not configured for selected plan" });
      }

      let subscription = await storage.getSubscription(userId);
      if (!subscription) {
        subscription = await storage.createSubscription(userId, "free");
      }

      let customerId = subscription.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateSubscription(userId, { stripeCustomerId: customerId });
      }

      try {
        await stripe.prices.retrieve(priceId);
      } catch (error) {
        console.error("Stripe price lookup error:", error);
        return res.status(400).json({ error: "Stripe price not found for selected plan" });
      }

      const appUrl = resolveAppUrl(req);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: plan === "lifetime" ? "payment" : "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${appUrl}/dashboard/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/account?canceled=true`,
        metadata: { userId, plan },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/checkout-session/:sessionId", async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const sessionId = req.params.sessionId as string;

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (!session) {
        return res.status(404).json({ error: "Checkout session not found" });
      }

      const userId = session.metadata?.userId;
      if (!userId) {
        return res.status(400).json({ error: "Invalid checkout session - missing user ID" });
      }

      // If the user's session was lost during Stripe redirect, re-establish it
      if (!req.session.userId) {
        req.session.userId = userId;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => err ? reject(err) : resolve());
        });
      } else if (req.session.userId !== userId) {
        // If logged in as different user, this is an error
        return res.status(403).json({ error: "Session does not belong to current user" });
      }

      let plan = normalizePlan(session.metadata?.plan);

      if (plan === "free") {
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId as string, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id;
        plan = resolvePlanFromPrice(priceId) ?? "free";
      }

      if (plan === "free") {
        return res.status(400).json({ error: "Unable to determine plan from checkout session" });
      }

      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return res.status(400).json({ error: "Checkout session not paid" });
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      let stripeSubscriptionId: string | null = null;
      let status = "active";
      let currentPeriodEnd: Date | undefined;

      if (session.mode === "subscription") {
        stripeSubscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

        const subscription = typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

        if (subscription) {
          status = subscription.status;
          const periodEnd = (subscription as { current_period_end?: number }).current_period_end;
          currentPeriodEnd = periodEnd
            ? new Date(periodEnd * 1000)
            : undefined;
        }
      }

      const existingSubscription = await storage.getSubscription(userId);
      const existingStripeSubscriptionId = existingSubscription?.stripeSubscriptionId;
      if (
        existingStripeSubscriptionId &&
        (plan === "lifetime" || (stripeSubscriptionId && existingStripeSubscriptionId !== stripeSubscriptionId))
      ) {
        try {
          await stripe.subscriptions.cancel(existingStripeSubscriptionId);
        } catch (error) {
          console.warn("Stripe subscription cancel error:", error);
        }
      }

      await storage.updateSubscription(userId, {
        plan,
        status,
        stripeCustomerId: customerId,
        stripeSubscriptionId,
        currentPeriodEnd,
      });

      res.json({ success: true, plan });
    } catch (error) {
      console.error("Stripe checkout session sync error:", error);
      res.status(500).json({ error: "Failed to sync checkout session" });
    }
  });

  app.post("/api/stripe/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription to cancel" });
      }

      const updatedSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      const periodEnd = (updatedSubscription as { current_period_end?: number }).current_period_end;
      await storage.updateSubscription(userId, {
        status: "cancelled",
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : undefined,
      });

      res.json({ success: true, message: "Subscription will be cancelled at the end of the billing period" });
    } catch (error) {
      console.error("Stripe cancel error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      // For express.raw(), req.body is already the Buffer
      // req.rawBody is set by the verify callback as a backup
      let payload: Buffer | undefined;
      
      if (Buffer.isBuffer(req.body)) {
        payload = req.body;
      } else if (Buffer.isBuffer(req.rawBody)) {
        payload = req.rawBody;
      }

      if (!payload) {
        console.error("Webhook error: raw body is missing or not a Buffer. Body type:", typeof req.body);
        return res.status(400).json({ error: "Webhook processing error" });
      }

      await WebhookHandlers.processWebhook(payload, sig);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  });

  app.get("/api/stripe/portal", requireAuth, async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId!;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const appUrl = resolveAppUrl(req);

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${appUrl}/dashboard/account`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });
}
