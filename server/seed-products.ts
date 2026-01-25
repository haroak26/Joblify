import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    
    console.log("Checking for existing Plus product...");
    
    const products = await stripe.products.search({ 
      query: "name:'Joblify Plus'" 
    });
    
    if (products.data.length > 0) {
      console.log("Plus product already exists:", products.data[0].id);
      
      const prices = await stripe.prices.list({
        product: products.data[0].id,
        active: true,
      });
      
      if (prices.data.length > 0) {
        console.log("Plus price already exists:", prices.data[0].id);
        console.log("\nSet STRIPE_PLUS_PRICE_ID to:", prices.data[0].id);
      }
      return;
    }
    
    console.log("Creating Joblify Plus product...");
    const product = await stripe.products.create({
      name: "Joblify Plus",
      description: "Unlock unlimited skills, 300 job scrapes per month, schedule access, and priority support",
      metadata: {
        plan_type: "plus",
        max_skills: "unlimited",
        max_jobs_per_month: "300",
        has_schedule_access: "true",
      },
    });
    console.log("Product created:", product.id);
    
    console.log("Creating monthly price...");
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 1900,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        billing_period: "monthly",
      },
    });
    console.log("Monthly price created:", monthlyPrice.id);
    
    console.log("\n========================================");
    console.log("SUCCESS! Set this environment variable:");
    console.log("STRIPE_PLUS_PRICE_ID=" + monthlyPrice.id);
    console.log("========================================\n");
    
  } catch (error) {
    console.error("Failed to create products:", error);
    process.exit(1);
  }
}

createProducts();
