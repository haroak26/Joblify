import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, Loader2, Sparkles, FileText, CheckCircle2, Wand2, MessageSquareQuote, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken } from "@/lib/queryClient";
import type { Resume } from "@shared/schema";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";
import { UpgradeDialog } from "@/components/UpgradeDialog";

const MIN_JOB_DESCRIPTION_LENGTH = 20;
const STYLE_QUESTIONS = [
  "How would you describe your ideal role and why it fits your career direction?",
  "What is one work achievement you are most proud of, and how do you usually describe it?",
  "When writing to a hiring manager, what tone feels most natural for you?",
] as const;

export default function CoverLetterGenerator() {
  useFeatureTracking(FEATURES.COVER_LETTER);

  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "creative">("professional");
  const [styleAnswers, setStyleAnswers] = useState<string[]>(["", "", ""]);
  const [result, setResult] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();

  const { data: resumesData } = useQuery<Resume[]>({ queryKey: ["/api/resumes"] });
  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });

  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          resumeId,
          jobDescription,
          tone,
          writingStyleAnswers: styleAnswers,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const error: any = new Error(errorData.error || "Failed to generate");
        error.code = errorData.code;
        error.message = errorData.message || errorData.error;
        throw error;
      }

      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Cover Letter Generated!", description: "Your personalized cover letter is ready." });
    },
    onError: (error: any) => {
      if (error?.code === "COVER_LETTER_LIMIT") {
        setShowUpgradeDialog(true);
        return;
      }
      toast({
        title: "Generation Failed",
        description: error?.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = () => {
    if (!result?.content) return;
    navigator.clipboard.writeText(result.content).then(() => {
      toast({ title: "Copied!", description: "Cover letter copied to clipboard" });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Unable to copy. Please copy manually.", variant: "destructive" });
    });
  };

  const downloadAsText = () => {
    if (!result?.content) return;
    const blob = new Blob([result.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Cover letter saved as text file" });
  };

  const updateStyleAnswer = (index: number, value: string) => {
    setStyleAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  const styleReady = styleAnswers.every((answer) => answer.trim().length >= 10);
  const isFormValid = styleReady && resumeId && jobDescription.trim().length >= MIN_JOB_DESCRIPTION_LENGTH;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Cover Letter
        </h2>
        <p className="text-muted-foreground">Build authentic, human sounding cover letters with a guided workflow.</p>
      </div>

      <Tabs defaultValue="cover-letter" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cover-letter" className="gap-2">
            <FileText className="w-4 h-4" />
            Cover Letter
          </TabsTrigger>
          <TabsTrigger value="ai-interview" className="gap-2">
            <Mic className="w-4 h-4" />
            AI Interview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover-letter" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><MessageSquareQuote className="w-5 h-5 text-primary" />Your Writing Style</CardTitle>
                  <CardDescription>Answer these 3 questions first so the cover letter sounds like you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {STYLE_QUESTIONS.map((question, index) => (
                    <div key={question} className="space-y-2">
                      <p className="text-sm font-medium">{index + 1}. {question}</p>
                      <Textarea
                        value={styleAnswers[index]}
                        onChange={(e) => updateStyleAnswer(index, e.target.value)}
                        rows={3}
                        placeholder="Write naturally, as if you are talking to a recruiter."
                        className="resize-none"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Each answer must be at least 10 characters.</p>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">1. Select Resume</CardTitle>
                  <CardDescription>Start with the resume you want to tailor from.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={resumeId} onValueChange={setResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">No resumes found. Create one first.</div>
                      ) : (
                        resumes.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span>{r.title}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">2. Add Job Description</CardTitle>
                  <CardDescription>Paste the full job post for better targeting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={10}
                    className="resize-none"
                    placeholder="Paste role requirements, responsibilities, and company details."
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{jobDescription.length} characters</span>
                    {jobDescription.length >= MIN_JOB_DESCRIPTION_LENGTH && (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">3. Choose Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Button onClick={() => generateMutation.mutate()} disabled={!isFormValid || generateMutation.isPending} className="w-full" size="lg">
                {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Cover Letter</>}
              </Button>
            </div>

            <div>
              {result ? (
                <Card className="border">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />Your Cover Letter</CardTitle>
                        <CardDescription>Review and customize before applying.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copyToClipboard}><Copy className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Copy</span></Button>
                        <Button variant="outline" size="sm" onClick={downloadAsText}><Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Download</span></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea value={result.content} readOnly rows={26} className="font-serif leading-relaxed resize-none" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border">
                  <CardContent className="py-16 text-center">
                    <h3 className="text-lg font-semibold mb-2">Follow the workflow to generate</h3>
                    <p className="text-sm text-muted-foreground">Answer your writing style questions, pick a resume, add the job description, then generate.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai-interview">
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Mic className="w-5 h-5 text-primary" />AI Interview</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">We are building guided mock interviews with role-specific questions, live feedback, and coaching insights.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="cover letters"
        currentPlan={usageData?.plan || "free"}
        limit={usageData?.limits?.maxCoverLetters}
        current={usageData?.usage?.coverLettersThisMonth}
      />
    </div>
  );
}
