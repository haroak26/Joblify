import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CleanTabs, CleanTabsContent, CleanTabsList, CleanTabsTrigger } from "@/components/ui/clean-tabs";
import { useToast } from "@/hooks/use-toast";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { ensureCsrfToken, getCsrfToken } from "@/lib/queryClient";

const priorityStyles: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function ResumeReview() {
  useFeatureTracking("resume_review");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [idealJob, setIdealJob] = useState("");
  const [concerns, setConcerns] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeMode, setResumeMode] = useState<"joblify" | "upload">("joblify");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [result, setResult] = useState<any>(null);

  type ReviewResult = {
    overallScore?: number;
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    keywordCoverage?: { score?: number };
    impactMetrics?: { foundCount?: number };
    recommendedEdits?: Array<{ section?: string; change?: string; why?: string; priority?: string }>;
    fitOutlook?: { currentFit?: string; ifTweaked?: string };
  };

  type ReviewHistoryItem = {
    id: string;
    idealJob: string;
    concerns?: string | null;
    reviewResult: ReviewResult;
    createdAt: string;
  };

  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({ queryKey: ["/api/resumes"] });
  const { data: history = [] } = useQuery<ReviewHistoryItem[]>({ queryKey: ["/api/resume-review/history"] });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfToken();
      const formData = new FormData();
      formData.append("idealJob", idealJob);
      if (concerns.trim()) {
        formData.append("concerns", concerns.trim());
      }

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
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/resume-review/history"] });
    },
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
            <Label>Concerns (optional)</Label>
            <Textarea
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="e.g., I have applied to 20 jobs but still haven't gotten interviews."
            />
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
              <div className="mt-3 space-y-3">
                {(result.recommendedEdits || []).map((e: any, i: number) => {
                  const normalizedPriority = String(e.priority || "low").toLowerCase();
                  return (
                    <div key={i} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge className={priorityStyles[normalizedPriority] || priorityStyles.low} variant="outline">
                          {normalizedPriority}
                        </Badge>
                        <p className="font-semibold">{e.section}</p>
                      </div>
                      <p className="text-sm">{e.change}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{e.why}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div><strong>Fit outlook:</strong> {result.fitOutlook?.currentFit} → {result.fitOutlook?.ifTweaked}</div>
            <div className="text-muted-foreground">
              For the overall resume review, you can touch up your resume with our AI enhancement tool.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>Your most recent 20 resume reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resume reviews yet. Run one to see it here.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.idealJob}</p>
                    <Badge variant="outline">Score: {item.reviewResult?.overallScore ?? "N/A"}%</Badge>
                  </div>
                  {item.concerns && <p className="mb-2 text-sm text-muted-foreground">Concerns: {item.concerns}</p>}
                  <p className="text-sm">{item.reviewResult?.summary || "No summary available."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
