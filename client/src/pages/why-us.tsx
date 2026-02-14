import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Target, 
  CheckCircle2, 
  Users,
  Zap,
  Shield,
  TrendingUp,
  Briefcase,
  ArrowRight,
  Star
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Resume Builder",
    description: "Our unique feature - build your resume through natural conversation. No more struggling with blank forms or template fields. Just chat with our AI assistant and watch your professional resume take shape.",
    highlight: true
  },
  {
    icon: Sparkles,
    title: "Personalized Questions",
    description: "Our AI adapts to your unique background, asking follow-up questions based on your responses. Tell us about your experience at Company X, and we'll ask relevant questions about your specific responsibilities and achievements."
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Traditional resume builders can take hours. With Joblify's conversational AI, create a professional, ATS-optimized resume in minutes. Spend less time formatting, more time applying."
  },
  {
    icon: Target,
    title: "ATS-Optimized",
    description: "Every resume created with Joblify is automatically optimized for Applicant Tracking Systems. Your resume will get past the robots and into human hands."
  },
  {
    icon: Shield,
    title: "Professional Quality",
    description: "Clean, modern templates designed by hiring experts. Your resume will look professional and make a strong first impression."
  },
  {
    icon: TrendingUp,
    title: "Continuous Improvement",
    description: "Return anytime to refine your resume. Our AI learns from your feedback and helps you tailor your resume for different opportunities."
  }
];

const benefits = [
  {
    title: "For Professionals",
    description: "Showcase your experience and skills effectively through conversation. Our AI helps you present your achievements in a cohesive, professional way.",
    icon: Briefcase
  },
  {
    title: "For Job Seekers",
    description: "Whether you're entry-level or executive, our AI adapts to your experience level and helps you highlight what matters most.",
    icon: Users
  },
  {
    title: "For Career Changers",
    description: "Transitioning industries? Our AI helps you identify and emphasize transferable skills that resonate with your target role.",
    icon: Zap
  }
];



export default function WhyUs() {
  const { user } = useAuth();
  const ctaLabel = user ? "My Dashboard" : "Get Started Free";
  const ctaLink = user ? "/dashboard" : "/register";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Why Choose Joblify"
        description="Discover why thousands of job seekers trust Joblify. AI-powered resume tools, smart job tracking, and personalized career coaching set us apart."
        keywords="why Joblify, best job search platform, AI career tools, resume builder comparison"
        canonicalUrl="https://joblifyai.com/why-us"
      />
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-xs font-medium bg-primary/10 text-primary border-none">
            <Star className="w-3 h-3 mr-1.5" />
            The Future of Resume Building
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Why Choose Joblify?
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            We're not just another resume builder. We're revolutionizing how professionals create resumes through the power of conversational AI.
          </p>
        </div>
      </section>

      {/* Main Feature - AI Chat Builder */}
      <section className="py-16 px-4 sm:px-6 bg-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-primary text-primary-foreground">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Our Unique Feature
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                AI Chat Resume Builder
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Say goodbye to intimidating blank forms and rigid templates. Our AI Chat Resume Builder transforms resume creation into a natural conversation.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Natural Conversation</h4>
                    <p className="text-sm text-muted-foreground">
                      Talk about your experience as if you're chatting with a career coach, not filling out a form.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Adaptive Follow-ups</h4>
                    <p className="text-sm text-muted-foreground">
                      Our AI asks personalized questions based on your answers, diving deeper into what makes you unique.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Real-time Preview</h4>
                    <p className="text-sm text-muted-foreground">
                      Watch your resume build in real-time as you chat, with instant feedback and suggestions.
                    </p>
                  </div>
                </div>
              </div>
              <Link href={ctaLink}>
                <Button size="lg">
                  {ctaLabel}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="bg-background border rounded-lg p-6 shadow-lg">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted p-3 rounded-lg rounded-tl-none">
                      <p className="text-sm">Hi! I'm your AI resume assistant. Let's build your resume together. What's your name?</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none">
                      <p className="text-sm">I'm Alex Johnson</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted p-3 rounded-lg rounded-tl-none">
                      <p className="text-sm">Great to meet you, Alex! What's your current role or the position you're targeting?</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none">
                      <p className="text-sm">I'm a Senior Software Engineer</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted p-3 rounded-lg rounded-tl-none">
                      <p className="text-sm">Excellent! Tell me about your most recent position...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground">
              Joblify combines cutting-edge AI with proven resume best practices
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={feature.highlight ? "border-primary shadow-lg" : ""}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    feature.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  {feature.highlight && (
                    <Badge className="w-fit bg-primary text-primary-foreground">Unique Feature</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits by Audience */}
      <section className="py-16 px-4 sm:px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Everyone
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you're a professional, job seeker, or career changer
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Comparison */}
      <section className="py-16 px-4 sm:px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Traditional vs. Joblify
            </h2>
            <p className="text-lg text-muted-foreground">
              See the difference for yourself
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Traditional Resume Builders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✗</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Intimidating blank forms</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✗</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Time-consuming manual entry</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✗</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Generic, one-size-fits-all approach</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✗</span>
                  </div>
                  <p className="text-sm text-muted-foreground">No guidance or suggestions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  Joblify
                  <Badge className="bg-primary text-primary-foreground">Better</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Natural conversation interface</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Fast, intuitive resume building</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Personalized to your unique background</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">AI-powered suggestions and optimization</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Build Your Resume the Smart Way?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start building your resume the smart way today
          </p>
          <Link href={ctaLink}>
            <Button size="lg" className="text-lg px-8">
              {ctaLabel}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
