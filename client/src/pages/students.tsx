import { Link } from "wouter";
import { Briefcase, CheckCircle2, GraduationCap, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { Footer } from "@/components/footer";

const highlights = [
  "Build ATS-friendly resumes from your coursework, projects, and internships.",
  "Get guidance on role-focused keywords for entry-level and internship applications.",
  "Create polished resumes in minutes with clean templates and real-time editing.",
];

export default function Students() {
  return (
    <div className="min-h-screen bg-background text-foreground [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SEO
        title="For Students"
        description="Joblify for students helps you build clean, ATS-friendly resumes and apply with confidence for internships and entry-level roles."
        keywords="student resume builder, internship resume, entry-level resume, ATS resume for students"
        canonicalUrl="https://joblify.com/students"
      />

      <nav className="fixed top-0 z-50 w-full border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Joblify</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Start Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="border-b px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Built for students</p>
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl">A simple resume workflow for campus-to-career success</h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              No clutter. No visual noise. Just practical tools to help you turn your classes, projects, and leadership experience into a resume recruiters can scan quickly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Create Student Resume</Button>
              </Link>
              <Link href="/features/ats-scanner">
                <Button size="lg" variant="outline">See ATS Scanner</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-semibold sm:text-3xl">What students get</h2>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-md border p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <div className="rounded-md border bg-background p-6">
              <GraduationCap className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Student-friendly prompts</h3>
              <p className="text-sm text-muted-foreground">Translate class projects, volunteer work, and campus leadership into strong resume bullets.</p>
            </div>
            <div className="rounded-md border bg-background p-6">
              <NotebookPen className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Fast editing</h3>
              <p className="text-sm text-muted-foreground">Update your resume for every internship application without rebuilding from scratch.</p>
            </div>
            <div className="rounded-md border bg-background p-6">
              <CheckCircle2 className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">ATS-ready output</h3>
              <p className="text-sm text-muted-foreground">Keep formatting clean so your resume is easy for hiring software and recruiters to read.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
