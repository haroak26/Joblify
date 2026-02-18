import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Download, Loader2, Sparkles, FileText, CheckCircle2, Wand2, MessageSquareQuote, ArrowLeft, ArrowRight, PenSquare, History } from "lucide-react";
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

type Step = "style" | "job" | "generate";

interface CoverLetterHistoryItem {
  id: string;
  content: string;
  createdAt: string;
  resumeId?: string;
}

export default function CoverLetterGenerator() {
  useFeatureTracking(FEATURES.COVER_LETTER);

  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [styleAnswers, setStyleAnswers] = useState<string[]>(["", "", ""]);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<Step>("style");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRecipientName, setEditorRecipientName] = useState("Hiring Manager");
  const [editorSenderName, setEditorSenderName] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const { toast } = useToast();

  const { data: resumesData } = useQuery<Resume[]>({ queryKey: ["/api/resumes"] });
  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });
  const { data: meData } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const { data: history = [] } = useQuery<CoverLetterHistoryItem[]>({ queryKey: ["/api/cover-letters"] });

  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const selectedResumeTitle = useMemo(() => resumes.find((r: any) => String(r.id) === String(resumeId))?.title, [resumes, resumeId]);

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
          tone: "professional",
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
      setEditorSenderName(meData?.user?.name || meData?.user?.username || "");
      setEditorContent(data?.content || "");
      toast({ title: "Cover Letter Generated", description: "Your professional cover letter is ready." });
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
    if (!editorContent) return;
    navigator.clipboard.writeText(editorContent).then(() => {
      toast({ title: "Copied", description: "Cover letter copied to clipboard" });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Unable to copy. Please copy manually.", variant: "destructive" });
    });
  };

  const downloadAsText = () => {
    if (!editorContent) return;
    const sender = editorSenderName?.trim() ? `${editorSenderName.trim()}\n\n` : "";
    const recipient = editorRecipientName?.trim() ? `Dear ${editorRecipientName.trim()},\n\n` : "";
    const finalText = `${recipient}${editorContent}\n\nSincerely,\n${sender || "Your Name"}`;
    const blob = new Blob([finalText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Cover letter saved as text file" });
  };

  const updateStyleAnswer = (index: number, value: string) => {
    setStyleAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  const styleReady = styleAnswers.every((answer) => answer.trim().length >= 10);
  const isFormValid = styleReady && resumeId && jobDescription.trim().length >= MIN_JOB_DESCRIPTION_LENGTH;

  const openEditor = () => {
    if (!result?.content) return;
    setEditorContent(result.content);
    setEditorSenderName(meData?.user?.name || meData?.user?.username || "");
    setEditorOpen(true);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Cover Letter
        </h2>
        <p className="text-muted-foreground">Presentation flow: answer your style questions, move next, add job details, then generate.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          {step === "style" && (
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Each answer must be at least 10 characters.</p>
                  <Button onClick={() => setStep("job")} disabled={!styleReady}>
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "job" && (
            <>
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">Select Resume</CardTitle>
                  <CardDescription>Use a Joblify resume as your base.</CardDescription>
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
                          <SelectItem key={r.id} value={String(r.id)}>
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
                  <CardTitle className="text-lg">Add Job Description</CardTitle>
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

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("style")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setStep("generate")} disabled={!resumeId || jobDescription.trim().length < MIN_JOB_DESCRIPTION_LENGTH}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {step === "generate" && (
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg">Generate Professional Cover Letter</CardTitle>
                <CardDescription>
                  Resume: <span className="font-medium text-foreground">{selectedResumeTitle || "Not selected"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  Tone is set to <span className="font-medium text-foreground">Professional</span> for polished, recruiter-ready writing.
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep("job")}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => generateMutation.mutate()} disabled={!isFormValid || generateMutation.isPending}>
                    {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Cover Letter</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-primary" />Past cover letters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cover letter history yet.</p>
              ) : (
                history.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setResult(item);
                      setEditorContent(item.content);
                      setEditorOpen(true);
                    }}
                    className="w-full rounded-md border p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{item.content.slice(0, 80)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {result ? (
            <Card className="border">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />Your Cover Letter</CardTitle>
                    <CardDescription>Open editor to customize recipient and sender details.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={openEditor}><PenSquare className="w-4 h-4 mr-2" />Open editor</Button>
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
                <p className="text-sm text-muted-foreground">Start with your writing style answers and continue step by step.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cover Letter Editor</DialogTitle>
            <DialogDescription>Personalize recipient and sender information before applying.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Hiring manager name</p>
              <Input value={editorRecipientName} onChange={(e) => setEditorRecipientName(e.target.value)} placeholder="Hiring Manager" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Your name</p>
              <Input value={editorSenderName} onChange={(e) => setEditorSenderName(e.target.value)} placeholder="Your full name" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Letter body</p>
            <Textarea value={editorContent} onChange={(e) => setEditorContent(e.target.value)} rows={16} className="resize-none font-serif" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={copyToClipboard}><Copy className="w-4 h-4 mr-2" />Copy</Button>
            <Button variant="outline" onClick={downloadAsText}><Download className="w-4 h-4 mr-2" />Download</Button>
          </div>
        </DialogContent>
      </Dialog>

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
