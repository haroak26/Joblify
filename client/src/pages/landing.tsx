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
  Star,
  Globe,
  Rocket,
  ShieldCheck
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Search,
    title: "Real-time Scanning",
    description: "Our proprietary engine monitors Reddit, X, and Facebook 24/7 to catch high-intent hiring posts seconds after they're live."
  },
  {
    icon: Zap,
    title: "AI Matchmaking",
    description: "Not just keyword matching. Our AI understands your deep expertise and cross-references it with job requirements."
  },
  {
    icon: MessageSquare,
    title: "Instant Pitching",
    description: "Generate highly personalized, high-conversion pitches that stand out in crowded inboxes with a single click."
  }
];

const platforms = [
  { name: "Reddit", icon: SiReddit, color: "text-orange-500" },
  { name: "X (Twitter)", icon: () => <span className="font-bold text-xl">𝕏</span>, color: "text-foreground" },
  { name: "Facebook", icon: SiFacebook, color: "text-blue-500" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Joblify</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button size="sm" className="px-5">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-semibold tracking-wider uppercase border-none bg-primary/10 text-primary">
              <Star className="w-3 h-3 mr-2 inline" />
              The Future of Freelancing
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              Stop scrolling. <br />
              <span className="text-primary">Start winning</span> gigs.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              The first AI-powered platform that turns social media noise into a high-quality pipeline of freelance opportunities.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-base">
                  Get Started for Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="h-14 px-8 text-base">
                View Live Demo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      </section>

      {/* Trust Bar */}
      <section className="py-12 border-y bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Scanning high-intent posts on:
            </p>
            <div className="flex items-center gap-12 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              {platforms.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <p.icon className="w-6 h-6" />
                  <span className="font-bold text-lg">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <div key={i} className="group">
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary/10 transition-colors">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-primary text-primary-foreground rounded-[2rem] mx-4 lg:mx-8 mb-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">
                Trusted by thousands of <br /> world-class freelancers.
              </h2>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-5xl font-extrabold mb-2">85%</p>
                  <p className="text-primary-foreground/80 font-medium">Faster discovery</p>
                </div>
                <div>
                  <p className="text-5xl font-extrabold mb-2">12k+</p>
                  <p className="text-primary-foreground/80 font-medium">Monthly active users</p>
                </div>
              </div>
            </div>
            <div className="bg-background/10 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <p className="text-xl italic mb-6 leading-relaxed">
                "Joblify changed my business. I found a $5k project on Reddit within 20 minutes of setting up my profile. The AI pitch generator is a game changer."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full" />
                <div>
                  <p className="font-bold text-lg">Alex Rivera</p>
                  <p className="text-primary-foreground/70">Full-stack Developer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-6xl font-extrabold mb-8 tracking-tight">
            Ready to find your <br /> next project?
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
            Join the elite circle of freelancers using AI to dominate their market. No credit card required.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="h-16 px-12 text-lg font-bold">
              Start Free Today
              <ArrowRight className="ml-3 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Joblify</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Joblify. Built with passion for freelancers.
          </p>
        </div>
      </footer>
    </div>
  );
}
