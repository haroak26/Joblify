import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Briefcase, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Resume } from "@shared/schema";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";

export default function TailorPage() {
  useFeatureTracking(FEATURES.TAILOR);

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: resumesData, isLoading: resumesLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const handleContinueToEditor = () => {
    if (!selectedResumeId) {
      toast({
        title: "Resume required",
        description: "Select one of your Joblify resumes to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: "Job description required",
        description: "Paste the job description so AI can tailor each resume section.",
        variant: "destructive",
      });
      return;
    }

    sessionStorage.setItem(`joblify:tailor:${selectedResumeId}`, jobDescription.trim());
    setLocation(`/dashboard/resume-builder/${selectedResumeId}?mode=ai&aiMode=tailor`);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-subheader mb-1 flex items-center gap-2 font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Resume Tailor
        </h2>
        <p className="text-muted-foreground">
          Add one job description, choose a Joblify resume, and continue to the editor where AI tailors each section directly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-body">Tailoring setup</CardTitle>
          <CardDescription>
            This tool only works with resumes created in Joblify so edits can be applied section-by-section in the editor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tailor-job-description" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job description
            </Label>
            <Textarea
              id="tailor-job-description"
              rows={8}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job description. AI will use this to adjust your summary, experience, skills, and other sections to match the role naturally."
              className="resize-none"
            />
            <p className="text-small text-muted-foreground">
              Tip: Include responsibilities, required skills, and preferred qualifications for the strongest tailoring.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tailor-resume-select" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Joblify resume
            </Label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger id="tailor-resume-select">
                <SelectValue placeholder="Select a Joblify resume" />
              </SelectTrigger>
              <SelectContent>
                {resumesLoading ? (
                  <div className="p-2 text-small text-muted-foreground">Loading resumes...</div>
                ) : resumes.length === 0 ? (
                  <div className="p-2 text-small text-muted-foreground">No Joblify resumes found. Create one first.</div>
                ) : (
                  resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      <div className="flex items-center gap-2">
                        <span>{resume.title}</span>
                        <Badge variant="outline">Joblify</Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleContinueToEditor} className="w-full" size="lg">
            Continue to Tailor Editor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
