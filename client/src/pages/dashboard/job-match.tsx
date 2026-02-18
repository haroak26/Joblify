import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Target, FileText, Loader2, Search, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";
import { useToast } from "@/hooks/use-toast";
import { ensureCsrfToken, getCsrfToken } from "@/lib/queryClient";

interface MatchResult {
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  experienceMatch: string;
  educationMatch: string;
  quickTweaks?: Array<{ change: string; impact: string; roles: string[] }>;
  recommendedRoles?: string[];
}

export default function JobMatch() {
  useFeatureTracking(FEATURES.JOB_MATCH);
  const { toast } = useToast();

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobText, setJobText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);

  const { data: resumesData } = useQuery<{ resumes: Array<{ id: number; title: string }> }>({ queryKey: ["/api/resumes"] });
  const resumes = resumesData?.resumes || [];

  const jobDescriptions = useMemo(
    () => jobText.split("\n\n").map((s) => s.trim()).filter((s) => s.length >= 20),
    [jobText],
  );

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfToken();
      const formData = new FormData();
      formData.append("resumeId", selectedResumeId);
      formData.append("jobDescriptions", JSON.stringify(jobDescriptions));
      if (files) {
        Array.from(files).forEach((file) => formData.append("files", file));
      }

      const res = await fetch("/api/job-match/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: getCsrfToken() ? { "x-csrf-token": getCsrfToken()! } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to analyze job match");
      }
      return res.json();
    },
    onSuccess: (data) => setResults(data.results || []),
    onError: (error: Error) => toast({ title: "Analysis failed", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="container mx-auto w-full max-w-6xl space-y-6 px-4 pb-8 sm:px-6">
      <div>
        <h2 className="text-subheader mb-1 flex items-center gap-2 font-bold"><Target className="h-6 w-6 text-primary" />Job Match</h2>
        <p className="text-muted-foreground">Bulk scan multiple jobs and upload JD PDFs/DOCX files. Separate pasted job descriptions with blank lines.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Job Match</CardTitle>
          <CardDescription>Free: 2 scans (up to 5 jobs each). Plus: 5 scans (up to 20 jobs). Ultra: 50 scans (up to 50 jobs).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
            <SelectTrigger><SelectValue placeholder="Choose resume" /></SelectTrigger>
            <SelectContent>{resumes.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>)}</SelectContent>
          </Select>

          <Textarea className="min-h-[180px]" value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder="Paste one or multiple job descriptions here..." />
          <Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={(e) => setFiles(e.target.files)} />

          <Button className="w-full" disabled={!selectedResumeId || (jobDescriptions.length === 0 && !files?.length) || analyzeMutation.isPending} onClick={() => analyzeMutation.mutate()}>
            {analyzeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : <><Search className="mr-2 h-4 w-4" />Analyze Jobs</>}
          </Button>
        </CardContent>
      </Card>

      {results.map((result, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">Result #{idx + 1} <Badge>{result.matchScore}%</Badge></CardTitle>
            <CardDescription>{result.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><strong>Matched skills:</strong> {result.matchedSkills.join(", ") || "None"}</div>
            <div><strong>Missing skills:</strong> {result.missingSkills.join(", ") || "None"}</div>
            <div><strong>Experience:</strong> {result.experienceMatch}</div>
            <div><strong>Education:</strong> {result.educationMatch}</div>
            {(result.quickTweaks || []).length > 0 && (
              <div>
                <strong>Quick tweaks that can improve compatibility:</strong>
                <ul className="mt-1 space-y-1">
                  {result.quickTweaks?.map((t, i) => <li key={i}>• {t.change} — {t.impact} (Best for: {t.roles?.join(", ") || "General"})</li>)}
                </ul>
              </div>
            )}
            {(result.recommendedRoles || []).length > 0 && <div><strong>Recommended roles:</strong> {result.recommendedRoles?.join(", ")}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
