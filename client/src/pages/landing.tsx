import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Briefcase,
  Star,
  CheckCircle2
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Search,
    title: "Real-time Scanning",
    description: "Our engine monitors Reddit, X, and Facebook 24/7 to catch hiring posts seconds after they go live."
  },
  {
    icon: Zap,
    title: "AI Matchmaking",
    description: "Our AI understands your expertise and matches you with the most relevant opportunities."
  },
  {
    icon: MessageSquare,
    title: "Instant Pitching",
    description: "Generate personalized pitches that stand out with a single click."
  }
];

const platforms = [
  { name: "Reddit", icon: SiReddit, color: "text-orange-500" },
  { name: "X", icon: () => <span className="font-bold">𝕏</span>, color: "text-foreground" },
  { name: "Facebook", icon: SiFacebook, color: "text-blue-600" },
];

const benefits = [
  "Find opportunities before competitors",
  "AI suggests skills from your background",
  "Generate personalized pitches instantly",
  "Track applications and saved jobs",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Joblify</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-40 lg:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-5 text-xs font-medium bg-primary/10 text-primary border-none">
              <Star className="w-3 h-3 mr-1.5" />
              AI-Powered Job Discovery
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Find freelance gigs
              <span className="text-primary block mt-1">before anyone else</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Joblify scans social media in real-time to surface hiring opportunities that match your skills. Stop scrolling, start earning.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Start Free
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </Link>
              <Button variant="secondary" size="lg">
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-8 border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {platforms.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <p.icon className={`w-5 h-5 ${p.color}`} />
                <span className="font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three simple steps to land your next project
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {features.map((f, i) => (
              <div key={i} className="text-center sm:text-left">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-5 mx-auto sm:mx-0">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Everything you need to land more clients
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Joblify combines smart discovery with AI-powered tools to help you find and win more freelance work.
              </p>
              <div className="space-y-4">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">85%</p>
                <p className="text-sm text-muted-foreground">Faster discovery</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">12k+</p>
                <p className="text-sm text-muted-foreground">Active users</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">50k+</p>
                <p className="text-sm text-muted-foreground">Jobs matched</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">4.9</p>
                <p className="text-sm text-muted-foreground">User rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to find your next gig?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of freelancers using AI to discover opportunities faster.
          </p>
          <Link href="/dashboard">
            <Button size="lg">
              Get Started Free
              <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Joblify</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Joblify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
