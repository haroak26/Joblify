import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CleanTabs, CleanTabsContent, CleanTabsList, CleanTabsTrigger } from "@/components/ui/clean-tabs";
import { useToast } from "@/hooks/use-toast";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { ensureCsrfToken, getCsrfToken } from "@/lib/queryClient";

export default function ResumeReview() {
  useFeatureTracking("resume_review");
  const { toast } = useToast();
  const [idealJob, setIdealJob] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeMode, setResumeMode] = useState<"joblify" | "upload">("joblify");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [result, setResult] = useState<any>(null);

  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({ queryKey: ["/api/resumes"] });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfToken();
      const formData = new FormData();
      formData.append("idealJob", idealJob);

      if (resumeMode === "joblify") {
        if (!selectedResumeId) throw new Error("Please select a Joblify resume");
        formData.append("resumeId", selectedResumeId);
      } else {
        if (!file) throw new Error("Please add a resume file");
        formData.append("file", file);
      }

      const res = await fetch("/api/resume-review", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: getCsrfToken() ? { "x-csrf-token": getCsrfToken()! } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Resume review failed");
      }
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (error: Error) => toast({ title: "Resume review failed", description: error.message, variant: "destructive" }),
  });

  const hasResume = resumeMode === "joblify" ? Boolean(selectedResumeId) : Boolean(file);

  return (
    <div className="container mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Resume Review</CardTitle>
          <CardDescription>Use your Joblify resume or upload a file. We use your saved sections directly for Joblify resumes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ideal Job</Label>
            <Textarea value={idealJob} onChange={(e) => setIdealJob(e.target.value)} placeholder="e.g., Senior Product Manager in B2B SaaS" />
          </div>

          <div>
            <Label>Resume source</Label>
            <CleanTabs value={resumeMode} onValueChange={(value) => setResumeMode(value as "joblify" | "upload")}
              className="mt-2 space-y-3">
              <CleanTabsList className="w-full max-w-md">
                <CleanTabsTrigger value="joblify">Joblify Resume</CleanTabsTrigger>
                <CleanTabsTrigger value="upload">Upload File</CleanTabsTrigger>
              </CleanTabsList>
              <CleanTabsContent value="joblify" className="mt-0">
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a Joblify resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">No resumes found. Create one first.</div>
                    ) : (
                      resumes.map((resume) => (
                        <SelectItem key={resume.id} value={String(resume.id)}>{resume.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CleanTabsContent>
              <CleanTabsContent value="upload" className="mt-0">
                <Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </CleanTabsContent>
            </CleanTabs>
          </div>

          <Button className="w-full" disabled={!hasResume || idealJob.length < 10 || reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
            {reviewMutation.isPending ? "Reviewing..." : "Run Resume Review"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Score: {result.overallScore}%</CardTitle>
            <CardDescription>{result.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><strong>Strengths:</strong> {(result.strengths || []).join(", ")}</div>
            <div><strong>Gaps:</strong> {(result.gaps || []).join(", ")}</div>
            <div><strong>Keyword coverage:</strong> {result.keywordCoverage?.score}%</div>
            <div><strong>Impact metrics:</strong> Found {result.impactMetrics?.foundCount ?? 0} quantified bullets</div>
            <div>
              <strong>Recommended edits:</strong>
              <ul className="mt-1 space-y-1">
                {(result.recommendedEdits || []).map((e: any, i: number) => <li key={i}>• [{e.priority}] {e.section}: {e.change} — {e.why}</li>)}
              </ul>
            </div>
            <div><strong>Fit outlook:</strong> {result.fitOutlook?.currentFit} → {result.fitOutlook?.ifTweaked}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
