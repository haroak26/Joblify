import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Download, Loader2, Sparkles, FileText, CheckCircle2 } from "lucide-react";
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
      navigator.clipboard.writeText(result.content);
      toast({
        title: "Copied!",
        description: "Cover letter copied to clipboard",
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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header Section */}
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Cover Letter Generator
        </h2>
        <p className="text-muted-foreground">Create tailored cover letters in seconds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                Select Your Resume
              </CardTitle>
              <CardDescription>
                Choose the resume that best matches the job you're applying for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a resume to base your letter on" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No resumes found. Create one first.
                    </div>
                  ) : (
                    resumes.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2 py-1">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{r.title}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                Job Description
              </CardTitle>
              <CardDescription>
                Paste the complete job posting for the best results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here, including:&#10;• Job title&#10;• Requirements and qualifications&#10;• Responsibilities&#10;• Company information&#10;&#10;The more details you provide, the better your cover letter will be!"
                rows={12}
                className="font-mono text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {jobDescription.length} characters
                </p>
                {jobDescription.length > MIN_JOB_DESCRIPTION_LENGTH && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Good length
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                Writing Tone
              </CardTitle>
              <CardDescription>
                Choose the tone that matches the company culture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div className="py-1">
                      <div className="font-medium">Professional</div>
                      <div className="text-xs text-muted-foreground">Formal and business-oriented tone</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="enthusiastic">
                    <div className="py-1">
                      <div className="font-medium">Enthusiastic</div>
                      <div className="text-xs text-muted-foreground">Energetic and passionate approach</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="creative">
                    <div className="py-1">
                      <div className="font-medium">Creative</div>
                      <div className="text-xs text-muted-foreground">Unique and expressive style</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!isFormValid || generateMutation.isPending}
            className="w-full h-12 text-base"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Your Cover Letter...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </div>

        {/* Result Section */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {result ? (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Your Cover Letter
                    </CardTitle>
                    <CardDescription className="mt-1">
                      AI-generated and ready to use
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-gray-950 rounded-lg border p-6">
                  <Textarea 
                    value={result.content} 
                    rows={24}
                    readOnly
                    className="font-serif text-sm leading-relaxed border-0 focus-visible:ring-0 p-0 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Cover Letter Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Complete the form on the left and click "Generate Cover Letter" to create your personalized cover letter.
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
        currentPlan="free"
        limit={usageData?.limits?.maxCoverLetters}
        current={usageData?.usage?.coverLettersThisMonth}
      />
    </div>
  );
}
