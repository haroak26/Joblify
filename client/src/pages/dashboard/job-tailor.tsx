import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, FileText, Loader2, Wand2, CheckCircle, Upload, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken, queryClient } from "@/lib/queryClient";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useLocation } from "wouter";

export default function JobTailor() {
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/resumes"],
  });

  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });

  const importResumeMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) {
        throw new Error("Please choose a PDF or DOCX file first.");
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to parse and import resume");
      }
      return res.json();
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setSelectedResumeId(data?.resume?.id || "");
      setUploadFile(null);
      toast({
        title: "Resume parsed",
        description: "Your resume was imported and selected for tailoring.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Could not parse this file.",
        variant: "destructive",
      });
    },
  });

  const tailorMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch(`/api/resumes/${selectedResumeId}/tailor`, {
        method: "POST",
        headers,
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const error: any = new Error(err.message || err.error || "Failed to tailor resume");
        error.code = err.code;
        throw error;
      }
      return res.json();
    },
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({ title: "Tailoring Complete", description: "Your resume is optimized and ready to edit." });
    },
    onError: (error: any) => {
      if (error.code === "USAGE_LIMIT_REACHED") {
        setShowUpgradeDialog(true);
        return;
      }
      toast({ title: "Tailoring Failed", description: error.message, variant: "destructive" });
    },
  });

  const trimmedJobDescription = jobDescription.trim();

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          AI Job Tailor
        </h2>
        <p className="text-muted-foreground">
          Tailor your resume to a specific role, then fine-tune it in the editor.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Choose Base Resume
            </CardTitle>
            <CardDescription>
              Pick an existing resume or upload one for full parsing first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resume to tailor" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((resume: any) => (
                  <SelectItem key={resume.id} value={String(resume.id)}>
                    {resume.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="text-sm font-medium">Or upload and parse a full resume</div>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                onClick={() => importResumeMutation.mutate()}
                disabled={!uploadFile || importResumeMutation.isPending}
                className="w-full"
              >
                {importResumeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing Resume...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Parse Resume
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-body flex items-center gap-2">
              <Target className="w-4 h-4" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here for the best tailoring results..."
              rows={10}
            />
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => tailorMutation.mutate()}
        disabled={tailorMutation.isPending || !selectedResumeId || trimmedJobDescription.length < 40}
        className="w-full"
        size="lg"
      >
        {tailorMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Tailoring Resume...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Tailor My Resume
          </>
        )}
      </Button>

      {result && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Tailoring Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Key Enhancements:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {(result.enhancements || []).map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setLocation(`/dashboard/resume-builder/${result?.resume?.id || selectedResumeId}`)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Open in Resume Editor
            </Button>
          </CardContent>
        </Card>
      )}

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="job tailoring"
        currentPlan={usageData?.plan || "free"}
      />
    </div>
  );
}
