import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";
import { PLAN_LIMITS, formatLimitValue } from "@shared/plan-limits";

const freeLimits = PLAN_LIMITS.free;
const studentLimits = PLAN_LIMITS.student;
const plusLimits = PLAN_LIMITS.plus;
const ultraLimits = PLAN_LIMITS.ultra;

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    subtitle: "Try core tools",
    features: [
      `${freeLimits.maxResumes} resume`,
      `${freeLimits.maxAIEditsPerMonth} AI edits / month`,
      `${freeLimits.maxAIBuilderActionsPerMonth} AI Builder actions / month`,
      `${freeLimits.maxATSScansPerMonth} ATS scans / month`,
      `${freeLimits.maxCoverLettersPerMonth} cover letters / month`,
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
  },
  {
    id: "student",
    name: "Student",
    price: "$5",
    period: "per month",
    subtitle: "Best value for students (.edu / .sch.uk)",
    features: [
      `${studentLimits.maxResumes} resumes`,
      `${studentLimits.maxAIEditsPerMonth} AI edits / month`,
      `${studentLimits.maxAIBuilderActionsPerMonth} AI Builder actions / month (across resumes)`,
      `${formatLimitValue(studentLimits.maxATSScansPerMonth)} ATS scans`,
      `${studentLimits.maxCoverLettersPerMonth} cover letters / month`,
    ],
    cta: "Get Student Plan",
    ctaHref: "/dashboard/account",
    popular: true,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    period: "per month",
    subtitle: "Heavy weekly usage",
    features: [
      `${plusLimits.maxResumes} resumes`,
      `${plusLimits.maxAIEditsPerMonth} AI edits / month`,
      `${plusLimits.maxAIBuilderActionsPerMonth} AI Builder actions / month (across resumes)`,
      `${plusLimits.maxATSScansPerMonth} ATS scans / month`,
      `${plusLimits.maxCoverLettersPerMonth} cover letters / month`,
    ],
    cta: "Upgrade to Plus",
    ctaHref: "/dashboard/account",
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$30",
    period: "per month",
    subtitle: "Best plan money can buy",
    features: [
      `${formatLimitValue(ultraLimits.maxResumes)} resumes`,
      `${formatLimitValue(ultraLimits.maxAIEditsPerMonth)} AI edits`,
      `${formatLimitValue(ultraLimits.maxAIBuilderActionsPerMonth)} AI Builder actions`,
      `${formatLimitValue(ultraLimits.maxATSScansPerMonth)} ATS scans`,
      `${formatLimitValue(ultraLimits.maxCoverLettersPerMonth)} cover letters`,
    ],
    cta: "Upgrade to Ultra",
    ctaHref: "/dashboard/account",
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Pricing Plans" description="Compare Joblify plans including Free, Student, Plus, and Ultra." canonicalUrl="https://joblify.com/pricing" />
      <Header />
      <section className="pt-28 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium bg-primary/10 text-primary border-none">Simple, Transparent Pricing</Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">Choose the plan that<span className="text-primary block mt-1">fits your needs</span></h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Every plan includes AI resume tools. Student pricing requires a school email ending in .edu or .sch.uk.</p>
        </div>
      </section>
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
                {plan.popular && <div className="absolute -top-3 left-0 right-0 flex justify-center"><Badge className="bg-primary text-primary-foreground px-3 py-1">Best Value</Badge></div>}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                    <div className="mt-4"><span className="text-4xl font-bold text-foreground">{plan.price}</span><span className="text-muted-foreground ml-2">/ {plan.period}</span></div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span className="text-sm text-muted-foreground">{feature}</span></li>
                    ))}
                  </ul>
                  <Link href={plan.ctaHref}>
                    <Button className="w-full mt-4" variant={plan.popular ? "default" : "outline"}>
                      {plan.cta}
                      {!user && plan.id === "free" && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
