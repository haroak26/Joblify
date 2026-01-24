import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Briefcase,
  Users,
  TrendingUp,
  CheckCircle2,
  Star
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Search,
    title: "Smart Discovery",
    description: "Our platform scans Reddit, X, and Facebook to find freelance opportunities that match your skills automatically."
  },
  {
    icon: Zap,
    title: "Real-Time Matching",
    description: "Get instant notifications when new opportunities match your expertise. Never miss a perfect gig again."
  },
  {
    icon: MessageSquare,
    title: "AI-Powered Outreach",
    description: "Generate personalized, professional follow-up messages tailored to each opportunity with one click."
  }
];

const platforms = [
  { name: "Reddit", icon: SiReddit, color: "text-orange-500" },
  { name: "X (Twitter)", icon: () => <span className="font-bold text-xl">𝕏</span>, color: "text-foreground" },
  { name: "Facebook", icon: SiFacebook, color: "text-blue-500" },
];

const stats = [
  { value: "50K+", label: "Jobs Found", icon: Briefcase },
  { value: "12K+", label: "Freelancers", icon: Users },
  { value: "85%", label: "Success Rate", icon: TrendingUp },
];

const benefits = [
  "Find opportunities before your competition",
  "AI suggests skills based on your experience",
  "Generate personalized pitches instantly",
  "Track applications and saved jobs",
  "Works with Reddit, X, and Facebook",
  "Dark mode for late-night hustle"
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl" data-testid="text-logo">Joblify</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button size="lg" className="rounded-lg font-semibold" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm rounded-lg" data-testid="badge-hero">
              <Star className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Find Freelance Work Faster
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="text-hero-title">
              Discover Freelance Jobs
              <span className="block text-primary mt-2">Before Anyone Else</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-description">
              Joblify scans social platforms in real-time to find freelance opportunities 
              that match your skills. Stop scrolling, start earning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 rounded-lg h-12 px-8 text-base font-semibold" data-testid="button-start-free">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="rounded-lg h-12 px-8 text-base" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-10 px-4 sm:px-6 border-y bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm text-muted-foreground mb-6">
              We scan opportunities from these platforms
            </p>
            <div className="flex items-center justify-center gap-10 sm:gap-20 flex-wrap">
              {platforms.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2.5" data-testid={`platform-${platform.name.toLowerCase()}`}>
                  <platform.icon className={`w-7 h-7 ${platform.color}`} />
                  <span className="font-semibold text-lg">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-features-title">
                How Joblify Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our intelligent system does the heavy lifting so you can focus on what you do best.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="hover-elevate border"
                  data-testid={`feature-card-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-xl mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30 border-y">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Everything You Need to Land More Clients
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Joblify combines smart discovery with AI-powered tools to help you find and win more freelance work.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {stats.map((stat) => (
                  <Card key={stat.label} className="border" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                        <stat.icon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-primary">{stat.value}</p>
                        <p className="text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-cta-title">
              Ready to Find Your Next Gig?
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              Join thousands of freelancers who are already landing clients through Joblify.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 rounded-lg h-12 px-10 text-base font-semibold" data-testid="button-cta-start">
                Get Started Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Joblify</span>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
            2025 Joblify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
