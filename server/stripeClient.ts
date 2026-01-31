import Stripe from 'stripe';

async function getCredentials() {
  const envSecretKey = process.env.STRIPE_SECRET_KEY;
  const envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!envSecretKey) {
    throw new Error("Stripe secret key not configured");
  }

  return {
    publishableKey: envPublishableKey || "",
    secretKey: envSecretKey,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  if (!publishableKey) {
    throw new Error("Stripe publishable key not configured");
  }
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
