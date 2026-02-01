import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Briefcase, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "10 skills maximum",
      "10 jobs scraped per month",
      "5 AI messages per month",
      "Basic job matching",
      "Community support"
    ],
    cta: "Get Started",
    ctaHref: "/register",
    popular: false,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    period: "per month",
    features: [
      "Unlimited skills",
      "300 jobs scraped per month",
      "500 AI messages per month",
      "2 scheduled scans",
      "Priority support",
      "Advanced job matching"
    ],
    cta: "Upgrade to Plus",
    ctaHref: "/dashboard/account",
    popular: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$30",
    period: "per month",
    features: [
      "Unlimited skills",
      "Unlimited jobs scraped",
      "Unlimited AI messages",
      "Unlimited scheduled scans",
      "Priority support",
      "Advanced job matching",
      "Early access to new features"
    ],
    cta: "Upgrade to Ultra",
    ctaHref: "/dashboard/account",
    popular: false,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "$100",
    period: "one-time payment",
    features: [
      "Unlimited skills",
      "Unlimited jobs scraped",
      "Unlimited AI messages",
      "Unlimited scheduled scans",
      "Priority support",
      "Advanced job matching",
      "Ultra access for life",
      "Support indie development"
    ],
    cta: "Get Lifetime Access",
    ctaHref: "/dashboard/account",
    popular: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Joblify</span>
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href={user ? "/dashboard" : "/login"}>
              <Button size="sm">{user ? "Dashboard" : "Sign In"}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium bg-primary/10 text-primary border-none">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Choose the plan that
            <span className="text-primary block mt-1">fits your needs</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include access to our AI-powered job matching engine.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${
                  plan.popular 
                    ? 'border-primary shadow-lg' 
                    : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">/ {plan.period}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.ctaHref}>
                    <Button 
                      className={`w-full mt-4 ${
                        plan.popular 
                          ? '' 
                          : 'variant-outline'
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                      {!user && plan.id === 'free' && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or cancel your subscription at any time from your account settings. 
                Changes take effect at the start of your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What happens when I hit my job limit?</h3>
              <p className="text-muted-foreground">
                On the Free plan, you'll need to wait for your monthly limit to reset. 
                Upgrade to Plus or Ultra for higher or unlimited job scraping.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What platforms do you scan?</h3>
              <p className="text-muted-foreground">
                We currently scan Reddit and X (Twitter) for freelance job opportunities. 
                We're constantly working to add more platforms.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Is the Lifetime plan really lifetime?</h3>
              <p className="text-muted-foreground">
                Yes! Pay once and get Ultra-level access for life. This is a special offer 
                for early adopters and beta testers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find your next gig?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of freelancers discovering opportunities before everyone else.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Joblify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
