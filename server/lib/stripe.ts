import { createHmac, timingSafeEqual } from "crypto";
import type { PlanType } from "@shared/schema";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

type FormValue = string | number | boolean | null | undefined | FormValue[] | Record<string, FormValue>;

function appendFormData(params: URLSearchParams, key: string, value: FormValue): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormData(params, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendFormData(params, `${key}[${nestedKey}]`, nestedValue);
    }
    return;
  }
  params.append(key, String(value));
}

async function stripeRequest<T>(method: "GET" | "POST" | "DELETE", path: string, data?: Record<string, FormValue>): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. STRIPE_SECRET_KEY is missing.");
  }

  const url = new URL(`${STRIPE_API_BASE}${path}`);
  const headers: HeadersInit = {
    Authorization: `Bearer ${secretKey}`,
  };

  let body: string | undefined;
  if (method === "GET" && data) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => appendFormData(params, k, v));
    url.search = params.toString();
  } else if (data) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => appendFormData(params, k, v));
    body = params.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url.toString(), { method, headers, body });
  const json = await response.json();

  if (!response.ok) {
    const message = json?.error?.message || "Stripe API request failed";
    throw new Error(message);
  }

  return json as T;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PLUS_PRICE_ID &&
    process.env.STRIPE_ULTRA_PRICE_ID,
  );
}

export function getPriceIdForPlan(plan: PlanType): string {
  if (plan === "plus") {
    if (!process.env.STRIPE_PLUS_PRICE_ID) throw new Error("STRIPE_PLUS_PRICE_ID missing");
    return process.env.STRIPE_PLUS_PRICE_ID;
  }
  if (plan === "ultra") {
    if (!process.env.STRIPE_ULTRA_PRICE_ID) throw new Error("STRIPE_ULTRA_PRICE_ID missing");
    return process.env.STRIPE_ULTRA_PRICE_ID;
  }
  throw new Error(`Plan ${plan} is not billable via Stripe`);
}

export function getPlanByPriceId(priceId: string | undefined): PlanType {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PLUS_PRICE_ID) return "plus";
  if (priceId === process.env.STRIPE_ULTRA_PRICE_ID) return "ultra";
  return "free";
}

export async function getOrCreateCustomer(params: {
  email: string;
  name?: string | null;
  userId: string;
  existingCustomerId?: string | null;
}) {
  if (params.existingCustomerId) {
    try {
      const existing = await stripeRequest<any>("GET", `/customers/${params.existingCustomerId}`);
      if (!existing.deleted) {
        return existing;
      }
    } catch {
      // fallback to creating new customer
    }
  }

  return stripeRequest<any>("POST", "/customers", {
    email: params.email,
    name: params.name || undefined,
    metadata: {
      userId: params.userId,
    },
  });
}

export async function findPromotionCodeId(code: string): Promise<string | null> {
  const result = await stripeRequest<any>("GET", "/promotion_codes", {
    code,
    active: true,
    limit: 1,
  });
  const promotion = result.data?.[0];
  return promotion?.id || null;
}

export async function createCheckoutSession(params: {
  customerId: string;
  userId: string;
  email: string;
  plan: PlanType;
  successUrl: string;
  cancelUrl: string;
  promotionCodeId?: string | null;
}) {
  const priceId = getPriceIdForPlan(params.plan);
  const body: Record<string, FormValue> = {
    mode: "subscription",
    customer: params.customerId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: params.promotionCodeId ? undefined : true,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    metadata: {
      userId: params.userId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
      },
      trial_period_days: params.plan === "plus" ? 7 : undefined,
    },
  };

  if (params.promotionCodeId) {
    body.discounts = [{ promotion_code: params.promotionCodeId }];
  }

  return stripeRequest<any>("POST", "/checkout/sessions", body);
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripeRequest<any>("GET", `/checkout/sessions/${sessionId}`, {
    expand: ["subscription", "customer", "subscription.items.data.price"],
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripeRequest<any>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function listActiveSubscriptions(customerId: string) {
  const result = await stripeRequest<any>("GET", "/subscriptions", {
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return (result.data || []).filter((sub: any) =>
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(sub.status),
  );
}

export async function cancelSubscription(subscriptionId: string, immediate = false) {
  if (immediate) {
    return stripeRequest<any>("DELETE", `/subscriptions/${subscriptionId}`);
  }

  return stripeRequest<any>("POST", `/subscriptions/${subscriptionId}`, {
    cancel_at_period_end: true,
  });
}

export async function updateSubscriptionPlan(subscriptionId: string, newPlan: PlanType) {
  const existing = await stripeRequest<any>("GET", `/subscriptions/${subscriptionId}`);
  const itemId = existing.items?.data?.[0]?.id;
  if (!itemId) {
    throw new Error("Unable to update plan: subscription item not found");
  }

  return stripeRequest<any>("POST", `/subscriptions/${subscriptionId}`, {
    cancel_at_period_end: false,
    proration_behavior: "create_prorations",
    items: [{
      id: itemId,
      price: getPriceIdForPlan(newPlan),
    }],
    metadata: {
      ...(existing.metadata || {}),
      plan: newPlan,
    },
  });
}

export async function retrieveSubscription(subscriptionId: string) {
  return stripeRequest<any>("GET", `/subscriptions/${subscriptionId}`, {
    expand: ["items.data.price"],
  });
}

export async function deleteCustomer(customerId: string) {
  return stripeRequest<any>("DELETE", `/customers/${customerId}`);
}

export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, item) => {
    const [k, v] = item.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    return false;
  }

  const payload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = createHmac("sha256", webhookSecret).update(payload).digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(sigBuf, expectedBuf);
}
