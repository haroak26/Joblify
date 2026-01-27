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
      <section className="pt-24 pb-14 sm:pt-28 sm:pb-16 lg:pt-40 lg:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 text-xs font-medium bg-primary/10 text-primary border-none">
                <Star className="w-3 h-3 mr-1.5" />
                AI-Powered Job Discovery
              </Badge>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                Find freelance gigs
                <span className="text-primary block mt-1">before anyone else</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Joblify scans social media in real-time to surface hiring opportunities that match your skills. Stop scrolling, start earning.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Button>
                </Link>
                <a href="#examples">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    See How It Works
                  </Button>
                </a>
              </div>
            </div>
            <div className="bg-muted/20 border rounded-2xl p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live Preview</p>
                <Badge variant="secondary" className="text-xs border-none bg-primary/10 text-primary">Realtime</Badge>
              </div>
              <div className="space-y-4">
                <div className="bg-background border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">SaaS Landing Page</p>
                    <span className="text-xs text-muted-foreground">Reddit · 2m ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Looking for a designer/dev to polish a SaaS hero + pricing section. Budget $1.5k.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["UI Design", "React", "Figma"].map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[11px] border-none bg-muted">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-background border rounded-xl p-4">
                  <p className="text-xs uppercase text-muted-foreground mb-2">AI Pitch Draft</p>
                  <p className="text-sm">
                    I can deliver a high-converting hero and pricing flow within a week. Recent work includes
                    SaaS launches that improved trials by 28%. Happy to share a quick mockup.
                  </p>
                </div>
                <div className="bg-background border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Match Score</p>
                    <p className="text-xs text-muted-foreground">Based on your skills + intro</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">92%</p>
                </div>
              </div>
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
      <section className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
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

      {/* Example */}
      <section id="examples" className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">Example workflow</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              See how a typical Joblify session turns a social post into a qualified lead.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 1</p>
              <h3 className="text-xl font-semibold mb-3">Import your experience</h3>
              <p className="text-muted-foreground">
                Add a short intro and a few skills. Joblify builds a matching profile instantly.
              </p>
            </div>
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 2</p>
              <h3 className="text-xl font-semibold mb-3">Get matched posts</h3>
              <p className="text-muted-foreground">
                Live feeds from Reddit, X, and Facebook surface the newest hiring posts for you.
              </p>
            </div>
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 3</p>
              <h3 className="text-xl font-semibold mb-3">Send a tailored pitch</h3>
              <p className="text-muted-foreground">
                Use AI to craft a crisp response, then track the lead inside your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-bold mb-6">
                Everything you need to land more clients
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <section className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Ready to find your next gig?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8">
            Join thousands of freelancers using AI to discover opportunities faster.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
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
