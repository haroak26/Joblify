import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CookieConsent } from "@/components/cookie-consent";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SEO } from "@/components/seo";
import { 
  Search, 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Star,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Builder",
    description: "Tell your story naturally, and our AI crafts your professional resume as you chat."
  },
  {
    icon: Search,
    title: "ATS Scanner",
    description: "Upload existing resumes and get instant feedback on ATS compatibility and optimization."
  },
  {
    icon: Zap,
    title: "Instant Export",
    description: "Download your resume as PDF or DOCX in seconds, ready to send to employers."
  }
];

const benefits = [
  "Build resumes through natural conversation",
  "AI suggests improvements and keywords",
  "Export as PDF or DOCX instantly",
  "ATS-compatible resume templates",
];

const keywordFaqs = [
  {
    question: "What is the best resume builder for 2026 job applications?",
    answer:
      "Joblify is an AI resume builder that helps you build your resume with keyword-rich content, clean formatting, and ATS-safe structure in one guided flow.",
  },
  {
    question: "Can I use Joblify as a free resume builder?",
    answer:
      "Yes. You can start with our free resume builder experience, create a complete resume, and export when you're ready.",
  },
  {
    question: "Do you support coverletter and CV letter writing?",
    answer:
      "Yes. Joblify includes AI support for coverletter writing and CV letter creation so your resume and supporting documents stay aligned.",
  },
  {
    question: "Does Joblify provide resume examples and resume formatting help?",
    answer:
      "Absolutely. You get guided resume examples, professional resume formatting suggestions, and actionable edits to improve readability and ATS performance.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const primaryCtaLabel = user ? "My Account" : "Get Started";
  const heroCtaLabel = user ? "My Account" : "Start Free";
  const secondaryCtaLabel = user ? "My Account" : "Get Started Free";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="AI Resume Builder, Resume Examples & Cover Letter Tools"
        description="Create a resume, CV, and coverletter with Joblify. Use our AI resume builder, resume formatting guidance, and ATS optimization tools to build your resume faster."
        keywords="resume, resume builder, build your resume, resume formatting, coverletter, cv letter, cv, resume examples, free resume builder, curriculums, resume now, AI resume builder"
        canonicalUrl="https://joblify.com"
      />
      
      {/* Navigation */}
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-14 sm:pt-32 sm:pb-16 lg:pt-40 lg:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 text-xs font-medium bg-primary/10 text-primary border-none">
                <Star className="w-3 h-3 mr-1.5" />
                AI-Powered Resume Builder
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                Build your perfect resume
                <span className="text-primary block mt-1">with AI</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                Joblify uses AI to craft professional resumes through natural conversation. No complicated forms. Just chat naturally and watch your resume come to life.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    {heroCtaLabel}
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="bg-background border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Your Resume Preview</p>
                    <span className="text-xs text-muted-foreground">Live · Building</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Senior Frontend Developer with 5+ years building scalable web applications using React, TypeScript, and modern frameworks.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["React", "TypeScript", "UI/UX"].map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[11px] border-none bg-muted">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-background border rounded-xl p-4">
                  <p className="text-xs uppercase text-muted-foreground mb-2">AI Suggestion</p>
                  <p className="text-sm">
                    Great start! I'd recommend highlighting your leadership experience and quantifying achievements. Would you like me to add metrics to your project descriptions?
                  </p>
                </div>
                <div className="bg-background border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">ATS Optimized</p>
                    <p className="text-xs text-muted-foreground">Formatted for applicant tracking systems</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Three simple steps to create your professional resume
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
              See how a typical Joblify session creates a professional resume in minutes.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 1</p>
              <h3 className="text-xl font-semibold mb-3">Chat with AI</h3>
              <p className="text-muted-foreground">
                Tell your story naturally. Share your experience, skills, and achievements in conversation.
              </p>
            </div>
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 2</p>
              <h3 className="text-xl font-semibold mb-3">AI builds your resume</h3>
              <p className="text-muted-foreground">
                Watch as AI crafts professional sections, suggests improvements, and optimizes for ATS.
              </p>
            </div>
            <div className="border rounded-2xl p-6 bg-background">
              <p className="text-xs uppercase text-muted-foreground mb-3">Step 3</p>
              <h3 className="text-xl font-semibold mb-3">Export and apply</h3>
              <p className="text-muted-foreground">
                Download as PDF or DOCX, choose from templates, and start applying to jobs.
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
                Everything you need to land your dream job
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
                Joblify combines AI conversation with professional formatting to help you create resumes that stand out.
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
                <p className="text-4xl font-bold text-primary mb-1">Fast</p>
                <p className="text-sm text-muted-foreground">Quick resume creation</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">Smart</p>
                <p className="text-sm text-muted-foreground">AI-powered optimization</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">ATS</p>
                <p className="text-sm text-muted-foreground">Optimized for applicant tracking systems</p>
              </div>
              <div className="bg-background border rounded-lg p-6">
                <p className="text-4xl font-bold text-primary mb-1">Free</p>
                <p className="text-sm text-muted-foreground">Get started at no cost</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO keyword support content */}
      <section id="sitemap" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-10">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">Resume, CV, and coverletter tools in one platform</h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Whether you search for a resume builder, resume examples, resume formatting guidance, CV tools, or a way to build your resume now,
              Joblify helps you create polished application documents faster with AI assistance.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              "resume",
              "resume builder",
              "build your resume",
              "resume formatting",
              "coverletter",
              "cv letter",
              "cv",
              "resume examples",
              "free resume builder",
              "curriculums",
              "resume now",
            ].map((keyword) => (
              <div key={keyword} className="border rounded-xl px-4 py-3 text-sm sm:text-base bg-background">
                {keyword}
              </div>
            ))}
          </div>

          <div className="max-w-4xl">
            <h3 className="text-xl sm:text-2xl font-semibold mb-6">Frequently asked questions</h3>
            <div className="space-y-4">
              {keywordFaqs.map((item) => (
                <details key={item.question} className="group border rounded-xl p-5 bg-background">
                  <summary className="cursor-pointer list-none font-medium flex items-start justify-between gap-4">
                    <span>{item.question}</span>
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="mt-3 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Ready to build your resume?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8">
            Start building your professional resume with AI today.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
              {secondaryCtaLabel}
              <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}
