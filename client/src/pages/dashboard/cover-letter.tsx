import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Download, Loader2, Sparkles, FileText, CheckCircle2, Wand2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken } from "@/lib/queryClient";
import type { Resume } from "@shared/schema";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";
import { UpgradeDialog } from "@/components/UpgradeDialog";

const MIN_JOB_DESCRIPTION_LENGTH = 20;

export default function CoverLetterGenerator() {
  // Track feature usage
  useFeatureTracking(FEATURES.COVER_LETTER);
  
  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "creative">("professional");
  const [result, setResult] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();

  const { data: resumesData } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });
  
  // Fetch usage data to get plan information
  const { data: usageData } = useQuery<any>({
    queryKey: ["/api/usage"],
  });
  
  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ resumeId, jobDescription, tone }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        const error: any = new Error(errorData.error || "Failed to generate");
        error.code = errorData.code;
        error.limit = errorData.limit;
        error.current = errorData.current;
        error.message = errorData.message || errorData.error;
        throw error;
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Cover Letter Generated!",
        description: "Your personalized cover letter is ready.",
      });
    },
    onError: (error: any) => {
      // Check if this is a limit error
      if (error?.code === "COVER_LETTER_LIMIT") {
        setShowUpgradeDialog(true);
      } else {
        toast({
          title: "Generation Failed",
          description: error?.message || "Please try again or contact support.",
          variant: "destructive",
        });
      }
    },
  });

  const copyToClipboard = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content).then(() => {
        toast({
          title: "Copied!",
          description: "Cover letter copied to clipboard",
        });
      }).catch(() => {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please select and copy manually.",
          variant: "destructive",
        });
      });
    }
  };

  const downloadAsText = () => {
    if (result?.content) {
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Downloaded!",
        description: "Cover letter saved as text file",
      });
    }
  };

  const isFormValid = resumeId && jobDescription.trim().length > MIN_JOB_DESCRIPTION_LENGTH;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header Section - Keep as requested */}
      <div className="mb-8">
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Cover Letter Generator
        </h2>
        <p className="text-muted-foreground">Create tailored cover letters in seconds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Input Section */}
        <div className="space-y-5">
          {/* Resume Selection */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-md">
                  1
                </div>
                <div>
                  <CardTitle className="text-lg">Select Resume</CardTitle>
                  <CardDescription className="text-sm">Choose your base resume</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger className="h-11 border-2 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No resumes found. Create one first.
                    </div>
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

          {/* Job Description */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-md">
                  2
                </div>
                <div>
                  <CardTitle className="text-lg">Job Description</CardTitle>
                  <CardDescription className="text-sm">Paste the complete job posting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here...&#10;&#10;Include:&#10;• Job title and requirements&#10;• Responsibilities&#10;• Company information&#10;&#10;More details = better results!"
                rows={10}
                className="text-sm resize-none border-2 hover:border-primary/50 transition-colors focus-visible:border-primary"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  {jobDescription.length} characters
                </p>
                {jobDescription.length > MIN_JOB_DESCRIPTION_LENGTH && (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Writing Tone */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-md">
                  3
                </div>
                <div>
                  <CardTitle className="text-lg">Writing Style</CardTitle>
                  <CardDescription className="text-sm">Match the company culture</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                <SelectTrigger className="h-11 border-2 hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div className="py-1.5">
                      <div className="font-semibold">Professional</div>
                      <div className="text-xs text-muted-foreground">Formal, business-focused tone</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="enthusiastic">
                    <div className="py-1.5">
                      <div className="font-semibold">Enthusiastic</div>
                      <div className="text-xs text-muted-foreground">Energetic and passionate</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="creative">
                    <div className="py-1.5">
                      <div className="font-semibold">Creative</div>
                      <div className="text-xs text-muted-foreground">Unique and expressive</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!isFormValid || generateMutation.isPending}
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </div>

        {/* Result Section */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {result ? (
            <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span>Your Cover Letter</span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      AI-generated and ready to customize
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                      className="hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-green-200 dark:border-green-800 p-6 shadow-inner">
                  <Textarea 
                    value={result.content} 
                    rows={26}
                    readOnly
                    className="font-serif text-sm leading-relaxed border-0 focus-visible:ring-0 p-0 resize-none bg-transparent"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6 shadow-inner">
                  <Send className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Fill out the form on the left with your resume, job description, and preferred tone, then click "Generate Cover Letter" to create your personalized cover letter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upgrade Dialog */}
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
