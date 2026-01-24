import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Briefcase,
  Users,
  TrendingUp
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Search,
    title: "Smart Discovery",
    description: "Our platform scans Reddit, X, and Facebook to find freelance opportunities that match your skills."
  },
  {
    icon: Zap,
    title: "Real-Time Matching",
    description: "Get instant notifications when new opportunities match your expertise."
  },
  {
    icon: MessageSquare,
    title: "AI-Powered Outreach",
    description: "Generate personalized follow-up messages tailored to each opportunity."
  }
];

const platforms = [
  { name: "Reddit", icon: SiReddit, color: "text-orange-500" },
  { name: "X (Twitter)", icon: () => <span className="font-bold text-lg">𝕏</span>, color: "text-foreground" },
  { name: "Facebook", icon: SiFacebook, color: "text-blue-500" },
];

const stats = [
  { value: "50K+", label: "Jobs Found", icon: Briefcase },
  { value: "12K+", label: "Freelancers", icon: Users },
  { value: "85%", label: "Success Rate", icon: TrendingUp },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" data-testid="text-logo">Joblify</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              Find Freelance Work Faster
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Discover Freelance Jobs
              <span className="block text-primary">Before Anyone Else</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Joblify scans social platforms in real-time to find freelance opportunities 
              that match your skills. Stop scrolling, start earning.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2" data-testid="button-start-free">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 border-y bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm text-muted-foreground mb-6">
              We scan opportunities from these platforms
            </p>
            <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap">
              {platforms.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2" data-testid={`platform-${platform.name.toLowerCase()}`}>
                  <platform.icon className={`w-6 h-6 ${platform.color}`} />
                  <span className="font-medium">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-features-title">
                How Joblify Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our intelligent system does the heavy lifting so you can focus on what you do best.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-6 border rounded-md bg-card hover-elevate"
                  data-testid={`feature-card-${index}`}
                >
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y">
          <div className="max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-cta-title">
              Ready to Find Your Next Gig?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of freelancers who are already landing clients through Joblify.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2" data-testid="button-cta-start">
                Get Started Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Briefcase className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-medium">Joblify</span>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
            2025 Joblify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
