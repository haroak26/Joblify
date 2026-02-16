import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 resume",
      "3 AI edits per month",
      "5 job imports per month",
      "Basic templates",
      "PDF download"
    ],
    whatYouGet: [
      "Create and store 1 professional resume",
      "Get 3 AI-powered edits monthly to enhance your content",
      "Import up to 5 jobs per month",
      "Access to basic resume templates",
      "Export your resume as PDF"
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
    popular: false,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    period: "per month",
    features: [
      "5 resumes",
      "50 AI edits per month",
      "100 job imports per month",
      "All templates",
      "PDF & DOCX download",
      "ATS scanner",
      "Cover letter generator"
    ],
    whatYouGet: [
      "Create and manage up to 5 resumes",
      "50 AI-powered edits per month",
      "Import up to 100 jobs per month",
      "Access to all premium templates",
      "Export as PDF and editable DOCX",
      "ATS optimization scanner",
      "AI-powered cover letter generator"
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
      "Unlimited resumes",
      "Unlimited AI edits",
      "Unlimited job imports",
      "All templates",
      "PDF & DOCX download",
      "ATS scanner",
      "Cover letter generator",
      "Resume & cover letter tailoring",
      "Priority support"
    ],
    whatYouGet: [
      "Unlimited resume creation and storage",
      "Unlimited AI-powered edits and optimizations",
      "Unlimited job imports from any source",
      "Full access to all premium templates",
      "Export as PDF and DOCX formats",
      "Advanced ATS optimization scanner",
      "AI-powered cover letter generator",
      "Tailor resumes and cover letters to specific jobs",
      "Priority customer support"
    ],
    cta: "Upgrade to Ultra",
    ctaHref: "/dashboard/account",
    popular: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Pricing Plans"
        description="Choose the perfect Joblify plan for your job search. Compare Free, Plus, Ultra, and Lifetime tiers with AI-powered resume tools and career features."
        keywords="pricing, job search plans, AI resume builder cost, career tools pricing, Joblify plans"
        canonicalUrl="https://joblify.com/pricing"
      />
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium bg-primary/10 text-primary border-none">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Choose the plan that
            <span className="text-primary block mt-1">fits your needs</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include access to our AI-powered resume builder.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
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
                      <>
                        {plan.cta}
                        {!user && plan.id === "free" && <ArrowRight className="w-4 h-4 ml-2" />}
                      </>
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
                Yes! You can upgrade or downgrade your subscription at any time from your account settings. 
                Upgrades take effect immediately, while downgrades occur at the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What happens when I hit my edit limit?</h3>
              <p className="text-muted-foreground">
                On the Free plan, you'll need to wait for your monthly limit to reset. 
                Upgrade to Plus or Ultra for higher or unlimited AI edits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What file formats can I export?</h3>
              <p className="text-muted-foreground">
                Free users can export as PDF. Plus and Ultra users can export as both PDF and DOCX 
                formats for maximum compatibility.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                Yes! We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, 
                contact support for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to build your resume?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start creating your professional resume with AI today.
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
      <Footer />
    </div>
  );
}
