import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { Briefcase, MessageSquare, Sparkles, CheckCircle2, Clock, Target, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const benefits = [
  {
    icon: MessageSquare,
    title: "Natural Conversation",
    description: "Build your resume by simply talking to our AI. No more struggling with blank forms or confusing templates."
  },
  {
    icon: Sparkles,
    title: "Intelligent Questions",
    description: "Our AI asks smart follow-up questions based on your responses, helping you uncover achievements you might have forgotten."
  },
  {
    icon: Clock,
    title: "Save Hours of Time",
    description: "Create a professional, ATS-optimized resume in minutes instead of hours spent formatting and organizing."
  },
  {
    icon: Target,
    title: "ATS-Optimized",
    description: "Every resume is automatically formatted to pass Applicant Tracking Systems and reach human reviewers."
  },
  {
    icon: Zap,
    title: "Real-Time Preview",
    description: "Watch your resume take shape as you chat, with instant updates showing exactly how it will look."
  },
  {
    icon: CheckCircle2,
    title: "Professional Quality",
    description: "Get expertly formatted resumes with clean, modern templates designed by hiring professionals."
  }
];

const features = [
  "Conversational interface - just chat naturally",
  "Context-aware AI that remembers your previous answers",
  "Smart suggestions for quantifying achievements",
  "Multiple export formats (PDF, DOCX)",
  "Unlimited revisions and edits",
  "Industry-specific optimization",
  "Real-time ATS compatibility checking",
  "Professional template library"
];

const useCases = [
  {
    title: "First-Time Job Seekers",
    description: "Never created a resume before? Our AI guides you through every step, asking the right questions to build a strong foundation for your career."
  },
  {
    title: "Career Changers",
    description: "Transitioning to a new field? The AI helps you identify and emphasize transferable skills that resonate with your target industry."
  },
  {
    title: "Busy Professionals",
    description: "No time to waste on formatting? Chat for 15 minutes and walk away with a polished, professional resume ready to send."
  },
  {
    title: "Freelancers",
    description: "Juggling multiple projects? Our AI helps you organize diverse experiences into a cohesive, professional narrative."
  }
];

export default function AIResumeBuilder() {
  const { user } = useAuth();

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
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href={user ? "/dashboard" : "/register"}>
              <Button size="sm">{user ? "Dashboard" : "Get Started"}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">Featured Tool</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">AI Resume Builder</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Build your professional resume through natural conversation. Our unique AI-powered chat interface makes resume creation as easy as talking to a friend.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href={user ? "/dashboard/resume-chat" : "/register"}>
                <Button size="lg">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
              </Link>
              <Link href="/why-us">
                <Button size="lg" variant="outline">Learn More</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose AI Resume Builder?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience a smarter, faster way to create professional resumes that get results
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Everything You Need</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perfect For Everyone</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're just starting out or a seasoned professional, our AI adapts to your needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{useCase.title}</CardTitle>
                  <CardDescription>{useCase.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground">
                  Simply click "Start Building" and begin chatting with our AI. It will introduce itself and ask about your professional background.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Answer Naturally</h3>
                <p className="text-muted-foreground">
                  Respond in your own words. The AI asks follow-up questions to dig deeper into your experience, achievements, and skills.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Watch It Build</h3>
                <p className="text-muted-foreground">
                  See your resume take shape in real-time as you chat. The AI automatically formats, organizes, and optimizes your information.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Download & Apply</h3>
                <p className="text-muted-foreground">
                  Export your polished resume in PDF or DOCX format and start applying with confidence. Make edits anytime by continuing the conversation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Resume?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Create your perfect resume through simple conversation
          </p>
          <Link href={user ? "/dashboard/resume-chat" : "/register"}>
            <Button size="lg">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
