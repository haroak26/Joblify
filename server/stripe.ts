import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

const PLUS_PRICE_ID = process.env.STRIPE_PLUS_PRICE_ID || "";
const ULTRA_PRICE_ID = process.env.STRIPE_ULTRA_PRICE_ID || "";

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
      const plan = requestedPlan === "ultra" ? "ultra" : "plus";
      const priceId = plan === "ultra" ? ULTRA_PRICE_ID : PLUS_PRICE_ID;
      
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

      const appUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${appUrl}/dashboard/account?success=true`,
        cancel_url: `${appUrl}/dashboard/account?canceled=true`,
        metadata: { userId, plan },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
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

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await storage.updateSubscription(userId, { status: "cancelled" });

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
      if (!Buffer.isBuffer(req.body)) {
        console.error("Webhook error: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      
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

      const appUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

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
