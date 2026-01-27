import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    
    const existingPlus = await stripe.products.search({
      query: "name:'Joblify Plus'",
    });
    const existingUltra = await stripe.products.search({
      query: "name:'Joblify Ultra'",
    });

    if (existingPlus.data.length > 0 && existingUltra.data.length > 0) {
      console.log("Plus and Ultra products already exist.");
      const plusPrices = await stripe.prices.list({
        product: existingPlus.data[0].id,
        active: true,
      });
      const ultraPrices = await stripe.prices.list({
        product: existingUltra.data[0].id,
        active: true,
      });

      if (plusPrices.data.length > 0) {
        console.log("Plus price already exists:", plusPrices.data[0].id);
        console.log("\nSet STRIPE_PLUS_PRICE_ID to:", plusPrices.data[0].id);
      }
      if (ultraPrices.data.length > 0) {
        console.log("Ultra price already exists:", ultraPrices.data[0].id);
        console.log("\nSet STRIPE_ULTRA_PRICE_ID to:", ultraPrices.data[0].id);
      }
      return;
    }

    console.log("Creating Joblify Plus product...");
    const plusProduct = await stripe.products.create({
      name: "Joblify Plus",
      description: "Unlock unlimited skills, 100 job scrapes per month, 2 schedules, and priority support",
      metadata: {
        plan_type: "plus",
        max_skills: "unlimited",
        max_jobs_per_month: "100",
        max_schedules: "2",
        has_schedule_access: "true",
      },
    });
    console.log("Plus product created:", plusProduct.id);

    console.log("Creating Plus monthly price...");
    const plusMonthlyPrice = await stripe.prices.create({
      product: plusProduct.id,
      unit_amount: 1500,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        billing_period: "monthly",
      },
    });
    console.log("Plus monthly price created:", plusMonthlyPrice.id);

    console.log("Creating Joblify Ultra product...");
    const ultraProduct = await stripe.products.create({
      name: "Joblify Ultra",
      description: "Unlimited jobs, unlimited skills, unlimited schedules, and priority support",
      metadata: {
        plan_type: "ultra",
        max_skills: "unlimited",
        max_jobs_per_month: "unlimited",
        max_schedules: "unlimited",
        has_schedule_access: "true",
      },
    });
    console.log("Ultra product created:", ultraProduct.id);

    console.log("Creating Ultra monthly price...");
    const ultraMonthlyPrice = await stripe.prices.create({
      product: ultraProduct.id,
      unit_amount: 3000,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        billing_period: "monthly",
      },
    });
    console.log("Ultra monthly price created:", ultraMonthlyPrice.id);

    console.log("\n========================================");
    console.log("SUCCESS! Set these environment variables:");
    console.log("STRIPE_PLUS_PRICE_ID=" + plusMonthlyPrice.id);
    console.log("STRIPE_ULTRA_PRICE_ID=" + ultraMonthlyPrice.id);
    console.log("========================================\n");
    
  } catch (error) {
    console.error("Failed to create products:", error);
    process.exit(1);
  }
}

createProducts();
