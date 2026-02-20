import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, FileText, Loader2, Wand2, CheckCircle, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken } from "@/lib/queryClient";
import { UpgradeDialog } from "@/components/UpgradeDialog";

export default function JobTailor() {
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();

  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/resumes"],
  });

  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });

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
        body: JSON.stringify({ jobDescription }),
      });
      if (!res.ok) {
        const err = await res.json();
        const error: any = new Error(err.message || "Failed to tailor resume");
        error.code = err.code;
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Tailoring Complete", description: "Your resume has been optimized for the job description." });
    },
    onError: (error: any) => {
      if (error.code === "USAGE_LIMIT_REACHED") {
        setShowUpgradeDialog(true);
        return;
      }
      toast({ title: "Tailoring Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          AI Job Tailor
        </h2>
        <p className="text-muted-foreground">
          Optimize your resume for a specific job description in seconds
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-body flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Select Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a resume to tailor" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((resume: any) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Paste the job description here..."
              rows={6}
            />
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => tailorMutation.mutate()}
        disabled={tailorMutation.isPending || !selectedResumeId || !jobDescription}
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
                {result.enhancements?.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
            <Button className="w-full" variant="outline" onClick={() => window.location.href = `/dashboard/resume-builder/${selectedResumeId}`}>
              View Updated Resume
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
