import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { Briefcase, FileText, Sparkles, CheckCircle2, Clock, Target, Zap, ArrowRight, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";

const benefits = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Intelligent cover letters tailored to each job posting, highlighting your most relevant experience and skills."
  },
  {
    icon: Target,
    title: "Job-Specific Content",
    description: "Automatically incorporates keywords and requirements from the job description to show you're the perfect fit."
  },
  {
    icon: Clock,
    title: "Generate in Seconds",
    description: "Create professional, customized cover letters in under a minute instead of spending hours writing from scratch."
  },
  {
    icon: MessageSquare,
    title: "Conversational Tone",
    description: "Natural, engaging writing that sounds human, not robotic. Our AI captures your unique voice and personality."
  },
  {
    icon: FileText,
    title: "Professional Structure",
    description: "Perfectly formatted cover letters with proper structure, tone, and length that hiring managers expect."
  },
  {
    icon: Zap,
    title: "Multiple Formats",
    description: "Export in PDF or DOCX format, ready to attach to your application or paste into online forms."
  }
];

const features = [
  "Job description analysis for keyword matching",
  "Resume integration for consistency",
  "Industry-specific language and tone",
  "Customizable templates and styles",
  "Unlimited revisions and regeneration",
  "Professional formatting",
  "Export to PDF and DOCX",
  "Save and reuse for similar positions"
];

const coverLetterSections = [
  {
    title: "Opening Paragraph",
    description: "Strong introduction that immediately captures attention and states your interest in the specific position."
  },
  {
    title: "Relevant Experience",
    description: "2-3 paragraphs highlighting your most relevant skills, achievements, and experiences that match the job requirements."
  },
  {
    title: "Why This Company",
    description: "Demonstrate genuine interest and explain why you're specifically excited about this company and role."
  },
  {
    title: "Call to Action",
    description: "Professional closing that expresses enthusiasm and invites further conversation about the opportunity."
  }
];

export default function CoverLetterGenerator() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="AI Cover Letter Generator"
        description="Create compelling, personalized cover letters in seconds with Joblify's AI cover letter generator. Tailored to each job application for maximum impact."
        keywords="AI cover letter generator, cover letter builder, personalized cover letters, job application tools"
        canonicalUrl="https://joblifyai.com/features/cover-letter"
      />
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
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Cover Letter Generator</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create compelling, job-specific cover letters in seconds with AI. Stand out from other applicants with personalized content that highlights your perfect fit.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href={user ? "/dashboard/cover-letter" : "/register"}>
                <Button size="lg">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Cover Letter
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
            <h2 className="text-3xl font-bold mb-4">Why Use Our Cover Letter Generator?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stop staring at a blank page. Let AI help you create cover letters that get you noticed.
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
          <h2 className="text-3xl font-bold mb-8 text-center">Powerful Features</h2>
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

      {/* Cover Letter Structure Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Professional Cover Letter Structure</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI generates cover letters with the structure hiring managers expect
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {coverLetterSections.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
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
                <h3 className="text-xl font-semibold mb-2">Paste Job Description</h3>
                <p className="text-muted-foreground">
                  Copy and paste the job posting you're applying for. Our AI analyzes the requirements, responsibilities, and company information.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Select Your Resume</h3>
                <p className="text-muted-foreground">
                  Choose which resume to base the cover letter on. The AI will pull relevant experience and achievements to highlight.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Add Personal Touches (Optional)</h3>
                <p className="text-muted-foreground">
                  Provide additional context like why you're interested in the company or specific projects that excite you.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Generate & Customize</h3>
                <p className="text-muted-foreground">
                  Get your personalized cover letter instantly. Review, make any edits, and download in your preferred format.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Cover Letters Matter Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Why Cover Letters Still Matter</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Show Your Interest</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A well-crafted cover letter demonstrates genuine interest in the role and company. It shows you've taken time to understand the position and aren't just mass-applying.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Explain Your Fit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  While your resume lists qualifications, a cover letter explains why you're perfect for this specific role. Connect the dots between your experience and their needs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stand Out from the Crowd</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Many applicants skip the cover letter. By including a compelling one, you immediately differentiate yourself and show professionalism and attention to detail.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Write Your Cover Letter?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Create professional, personalized cover letters that get you noticed
          </p>
          <Link href={user ? "/dashboard/cover-letter" : "/register"}>
            <Button size="lg">
              Start Writing Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
