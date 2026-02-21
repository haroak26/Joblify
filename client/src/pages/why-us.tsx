import { Link } from "wouter";
import { Briefcase, CheckCircle2, Clock3, Shield, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { Footer } from "@/components/footer";

const reasons = [
  "Build ATS-friendly resumes with clean formatting recruiters can read fast.",
  "Use AI guidance to rewrite bullets, improve keywords, and tailor for each role.",
  "Track your progress in one place with resume tools built for job search momentum.",
];

const pillars = [
  {
    icon: Sparkles,
    title: "Practical AI, not gimmicks",
    description:
      "Every suggestion is focused on clarity, impact, and relevance to your target role.",
  },
  {
    icon: Target,
    title: "Built for real applications",
    description:
      "Optimize for ATS systems while keeping language natural and results-focused.",
  },
  {
    icon: Clock3,
    title: "Faster workflow",
    description:
      "Make high-quality updates in minutes instead of rewriting your resume from scratch.",
  },
  {
    icon: TrendingUp,
    title: "Consistent improvement",
    description:
      "Get repeatable guidance so each version of your resume gets stronger over time.",
  },
  {
    icon: Shield,
    title: "Clear and trustworthy",
    description:
      "Straightforward plans, transparent limits, and account-level billing controls.",
  },
  {
    icon: CheckCircle2,
    title: "Simple by design",
    description:
      "A clean interface that helps you focus on writing better content, not fighting tools.",
  },
];

export default function WhyUs() {
  return (
    <div className="min-h-screen bg-background text-foreground [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SEO
        title="Why Joblify"
        description="See why job seekers choose Joblify for ATS-friendly resumes, practical AI support, and a faster workflow from draft to application."
        keywords="why joblify, AI resume builder, ATS resume tools, resume optimization"
        canonicalUrl="https://joblify.com/why-us"
      />

      <nav className="fixed top-0 z-50 w-full border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Joblify</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Start Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="border-b px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Why Joblify</p>
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">A focused resume platform for serious job seekers</h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Joblify helps you move from rough draft to confident applications with practical AI, ATS-first formatting, and an interface that keeps things simple.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Create Resume Free</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">Compare Plans</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-semibold sm:text-3xl">Why people choose us</h2>
            <div className="space-y-4">
              {reasons.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-md border p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-md border bg-background p-6">
                <pillar.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
