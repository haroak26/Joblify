import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Get the Stripe client instance
 * Uses a cached instance to avoid creating multiple clients
 * Reads the STRIPE_SECRET_KEY from environment variables
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  
  return stripeClient;
}

/**
 * Get a fresh Stripe client instance (uncached)
 * Useful for operations that need a new client (e.g., seeding)
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });
}
