import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { Briefcase, Target, Users, Zap, Heart, TrendingUp, Shield, Sparkles } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "User-Centered Design",
    description: "Everything we build starts with understanding your needs. We believe job searching should be empowering, not exhausting."
  },
  {
    icon: Sparkles,
    title: "AI Innovation",
    description: "We leverage cutting-edge AI to make resume building conversational, intuitive, and actually enjoyable."
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your career data is personal. We protect it with enterprise-grade security and never sell your information."
  },
  {
    icon: TrendingUp,
    title: "Continuous Improvement",
    description: "We're constantly learning from our users and evolving our platform to serve you better."
  }
];

const stats = [
  { number: "50K+", label: "Resumes Created" },
  { number: "98%", label: "ATS Pass Rate" },
  { number: "4.8/5", label: "User Rating" },
  { number: "30min", label: "Avg. Build Time" }
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Joblify</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/why-us">
              <Button variant="ghost" size="sm">Why Us</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 border-b">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">About Joblify</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Transforming How People Build Resumes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We believe creating a resume shouldn't be a chore. Our AI-powered platform makes it as simple as having a conversation.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  At Joblify, we're on a mission to democratize access to professional career tools. We believe that everyone, regardless of their background or resources, deserves a resume that truly represents their skills and experience.
                </p>
                <p>
                  Traditional resume builders are frustrating—they require you to fit your unique experience into rigid templates and force you to navigate confusing interfaces. We've reimagined the entire process from the ground up, using AI to make resume building feel natural and intuitive.
                </p>
                <p>
                  Our conversational approach means you can focus on sharing your story while our AI handles the formatting, optimization, and technical details. The result? Professional, ATS-optimized resumes created in a fraction of the time it would take with traditional tools.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Our Vision</h3>
              </div>
              <p className="text-muted-foreground">
                We envision a world where finding your dream job starts with a resume that opens doors instead of hitting walls. Where AI amplifies your strengths instead of replacing human expertise. Where the job application process is transparent, fair, and accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Joblify by the Numbers</h2>
            <p className="text-muted-foreground">
              See the impact we're making in the job search community
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make and every feature we build
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">How We Got Here</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Joblify was born from a simple frustration: creating a resume shouldn't require hours of formatting, template juggling, and wondering if you've included the right keywords. Our founders experienced this pain firsthand while helping friends and family members with their job searches.
            </p>
            <p>
              We realized that while AI technology had advanced tremendously, most resume builders still operated like digital versions of paper forms. There had to be a better way—one that leveraged conversational AI to make the process feel natural and actually helpful.
            </p>
            <p>
              After months of development and feedback from hundreds of beta users, we launched Joblify in late 2025. The response was overwhelming. People loved being able to "talk" through their experience rather than fill out endless forms. They appreciated getting ATS-optimized results without having to understand technical jargon.
            </p>
            <p>
              Today, we're constantly evolving based on user feedback, adding new features, and refining our AI to serve you better. But our core mission remains the same: make professional resume building accessible, efficient, and dare we say it—enjoyable.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built by Experts</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our team combines expertise in AI, career development, and user experience design
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-center">AI Engineers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  World-class AI specialists who've worked on natural language processing at leading tech companies, now dedicated to making resume building intelligent and intuitive.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-center">Career Experts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Professional resume writers and career coaches with decades of combined experience helping thousands of people land their dream jobs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-center">Design Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  UX designers passionate about creating delightful experiences that make complex tasks simple and accessible to everyone.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Best Resume?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of professionals who've already created their perfect resume with Joblify
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/why-us">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
