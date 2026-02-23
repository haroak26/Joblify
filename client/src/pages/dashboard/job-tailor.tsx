import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, FileText, Loader2, Wand2, CheckCircle, ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useLocation } from "wouter";

export default function JobTailor() {
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/resumes"],
  });

  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });

  const tailorMutation = useMutation({
    mutationFn: async () => {
      const description = jobDescription.trim();
      if (!selectedResumeId || description.length < 40) {
        throw new Error("Select a resume and add a fuller job description before continuing.");
      }

      sessionStorage.setItem(`joblify:tailor:${selectedResumeId}`, description);
      return { resumeId: selectedResumeId };
    },
    onSuccess: (data) => {
      toast({
        title: "Tailor workspace ready",
        description: "Opening your resume editor with AI Tailor mode.",
      });
      setLocation(`/dashboard/resume-builder/${data.resumeId}?mode=ai&aiMode=tailor`);
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
              Select your Joblify resume. Tailoring now works directly inside the resume editor.
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
            Start AI Tailor in Editor
          </>
        )}
      </Button>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-body flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            New Integrated Tailor Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add one job description.</p>
          <p>2. Pick your Joblify resume.</p>
          <p>3. AI Tailor opens in the editor and improves each section with targeted rewrites.</p>
          <p className="flex items-center gap-2 text-foreground font-medium pt-2">
            <ArrowRight className="w-4 h-4" />
            You stay in control and can accept edits section-by-section.
          </p>
        </CardContent>
      </Card>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="job tailoring"
        currentPlan={usageData?.plan || "free"}
      />
    </div>
  );
}
