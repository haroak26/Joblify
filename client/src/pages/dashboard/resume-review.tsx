import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { ensureCsrfToken, getCsrfToken } from "@/lib/queryClient";

export default function ResumeReview() {
  useFeatureTracking("resume_review");
  const { toast } = useToast();
  const [idealJob, setIdealJob] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please add a resume file");
      await ensureCsrfToken();
      const formData = new FormData();
      formData.append("idealJob", idealJob);
      formData.append("file", file);
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

  return (
    <div className="container mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Resume Review</CardTitle>
          <CardDescription>Upload your resume + ideal job. GPT-5-nano gives a deep review with concrete metrics and prioritized fixes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ideal Job</Label>
            <Textarea value={idealJob} onChange={(e) => setIdealJob(e.target.value)} placeholder="e.g., Senior Product Manager in B2B SaaS" />
          </div>
          <div>
            <Label>Resume file</Label>
            <Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" disabled={!file || idealJob.length < 10 || reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
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
