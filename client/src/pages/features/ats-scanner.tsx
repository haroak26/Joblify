import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { Briefcase, Search, CheckCircle2, AlertTriangle, FileText, Target, TrendingUp, ArrowRight, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const benefits = [
  {
    icon: Search,
    title: "Deep ATS Analysis",
    description: "Comprehensive scanning that identifies formatting issues, missing keywords, and optimization opportunities."
  },
  {
    icon: Target,
    title: "Keyword Matching",
    description: "Compare your resume against job descriptions to ensure you're hitting the right keywords employers are looking for."
  },
  {
    icon: TrendingUp,
    title: "Actionable Insights",
    description: "Get specific, prioritized recommendations on how to improve your ATS score and increase your chances."
  },
  {
    icon: Shield,
    title: "Format Validation",
    description: "Ensure your resume format is compatible with all major ATS systems used by employers."
  },
  {
    icon: FileText,
    title: "Section Analysis",
    description: "Verify that all standard resume sections are present and properly structured for ATS parsing."
  },
  {
    icon: CheckCircle2,
    title: "Pass Rate Prediction",
    description: "See your predicted ATS pass rate and understand what changes will have the biggest impact."
  }
];

const features = [
  "Upload existing resumes or scan Joblify-created resumes",
  "Compare against specific job descriptions",
  "Identify missing keywords and phrases",
  "Detect formatting issues that confuse ATS",
  "Validate section headers and structure",
  "Check file format compatibility",
  "Get prioritized improvement recommendations",
  "Track improvements over time"
];

const commonIssues = [
  {
    title: "Complex Formatting",
    description: "Tables, text boxes, and multi-column layouts that ATS systems can't parse correctly",
    severity: "high"
  },
  {
    title: "Missing Keywords",
    description: "Key skills and qualifications from the job description that aren't present in your resume",
    severity: "high"
  },
  {
    title: "Incorrect File Format",
    description: "PDFs created as images or uncommon formats that ATS systems can't read",
    severity: "medium"
  },
  {
    title: "Non-Standard Headers",
    description: "Creative section titles like 'My Journey' instead of standard headers like 'Work Experience'",
    severity: "medium"
  },
  {
    title: "Contact Info in Header/Footer",
    description: "Important contact information placed in areas many ATS systems can't read",
    severity: "high"
  },
  {
    title: "Special Characters",
    description: "Graphics, symbols, or unusual fonts that don't translate well through ATS parsing",
    severity: "low"
  }
];

export default function ATSScanner() {
  const { user } = useAuth();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-500 dark:text-red-400";
      case "medium": return "text-yellow-500 dark:text-yellow-400";
      case "low": return "text-blue-500 dark:text-blue-400";
      default: return "text-muted-foreground";
    }
  };

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
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">ATS Scanner</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ensure your resume passes Applicant Tracking Systems. Get detailed analysis and actionable recommendations to optimize for ATS success.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href={user ? "/dashboard/ats-scanner" : "/register"}>
                <Button size="lg">
                  <Search className="w-4 h-4 mr-2" />
                  Scan Your Resume
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
            <h2 className="text-3xl font-bold mb-4">Why Use ATS Scanner?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Don't let your resume get lost in the digital black hole. Ensure it passes ATS screening and reaches human reviewers.
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
          <h2 className="text-3xl font-bold mb-8 text-center">Comprehensive ATS Analysis</h2>
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

      {/* Common Issues Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Common ATS Issues We Detect</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our scanner identifies these frequent problems that cause resumes to fail ATS screening
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {commonIssues.map((issue, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${getSeverityColor(issue.severity)}`} />
                    <Badge variant={issue.severity === "high" ? "destructive" : "secondary"} className="text-xs">
                      {issue.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{issue.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
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
                <h3 className="text-xl font-semibold mb-2">Upload Your Resume</h3>
                <p className="text-muted-foreground">
                  Upload your existing resume in PDF or DOCX format, or select a resume you've created with Joblify.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Add Job Description (Optional)</h3>
                <p className="text-muted-foreground">
                  Paste in a specific job description to get tailored keyword matching and optimization suggestions for that role.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Detailed Analysis</h3>
                <p className="text-muted-foreground">
                  Receive a comprehensive report showing your ATS compatibility score, identified issues, and missing keywords.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Implement Improvements</h3>
                <p className="text-muted-foreground">
                  Follow our prioritized recommendations to fix issues and optimize your resume. Re-scan to track your improvements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why ATS Optimization Matters</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-sm text-muted-foreground">of Fortune 500 companies use ATS</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">75%</div>
              <div className="text-sm text-muted-foreground">of resumes are rejected by ATS before human review</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">3x</div>
              <div className="text-sm text-muted-foreground">higher interview rate with ATS-optimized resumes</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Optimize Your Resume?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands who've improved their ATS scores and increased their interview rates
          </p>
          <Link href={user ? "/dashboard/ats-scanner" : "/register"}>
            <Button size="lg">
              Scan Your Resume Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
