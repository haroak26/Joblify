import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Briefcase, Loader2, Download, Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TailorPage() {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [tailoredResume, setTailoredResume] = useState<any>(null);
  const [tailoredCoverLetter, setTailoredCoverLetter] = useState<any>(null);
  const { toast } = useToast();

  // Fetch user's jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: any[] }>({
    queryKey: ["/api/jobs"],
  });
  const jobs = jobsData?.jobs ?? [];

  // Fetch user's resumes
  const { data: resumes = [], isLoading: resumesLoading } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
  });

  // Get selected job details
  const selectedJob = jobs.find((j: any) => j.id === selectedJobId);

  // Tailor resume mutation
  const tailorResumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resumes/${selectedResumeId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to tailor resume");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTailoredResume(data.resume);
      toast({
        title: "Resume Tailored!",
        description: "Your resume has been optimized for this job.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Tailoring Failed",
        description: error.message || "Could not tailor resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Tailor cover letter mutation
  const tailorCoverLetterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cover-letter/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          jobId: selectedJobId,
          tone: "professional",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to tailor cover letter");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTailoredCoverLetter(data);
      toast({
        title: "Cover Letter Created!",
        description: "Your cover letter has been tailored for this job.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Tailoring Failed",
        description: error.message || "Could not create cover letter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTailorBoth = async () => {
    if (!selectedJobId || !selectedResumeId) {
      toast({
        title: "Missing Information",
        description: "Please select both a job and a resume.",
        variant: "destructive",
      });
      return;
    }

    await tailorResumeMutation.mutateAsync();
    await tailorCoverLetterMutation.mutateAsync();
  };

  const copyResumeToClipboard = () => {
    if (tailoredResume?.resumeData) {
      const text = formatResumeAsText(tailoredResume.resumeData);
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Tailored resume copied to clipboard",
      });
    }
  };

  const copyCoverLetterToClipboard = () => {
    if (tailoredCoverLetter?.content) {
      navigator.clipboard.writeText(tailoredCoverLetter.content);
      toast({
        title: "Copied!",
        description: "Cover letter copied to clipboard",
      });
    }
  };

  const formatResumeAsText = (resumeData: any) => {
    let text = `${resumeData.personalInfo?.name || ""}\n`;
    text += `${resumeData.personalInfo?.email || ""} | ${resumeData.personalInfo?.phone || ""}\n`;
    text += `${resumeData.personalInfo?.location || ""}\n\n`;
    
    if (resumeData.summary) {
      text += `SUMMARY\n${resumeData.summary}\n\n`;
    }
    
    if (resumeData.experience?.length > 0) {
      text += `EXPERIENCE\n`;
      resumeData.experience.forEach((exp: any) => {
        text += `${exp.title} at ${exp.company}\n`;
        text += `${exp.location} | ${exp.startDate} - ${exp.endDate || "Present"}\n`;
        exp.description?.forEach((desc: string) => {
          text += `• ${desc}\n`;
        });
        text += `\n`;
      });
    }
    
    return text;
  };

  const isLoading = tailorResumeMutation.isPending || tailorCoverLetterMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is available for Ultra subscribers. It uses AI to tailor your resume and cover letter to match specific job requirements.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <Briefcase className="w-5 h-5" />
              Select Job
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose the job you want to tailor your application for
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-select">Job Posting</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger id="job-select">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading jobs...</div>
                  ) : jobs.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No jobs found. Save some jobs first.
                    </div>
                  ) : (
                    jobs
                      .filter((j: any) => j.saved || j.applied)
                      .map((job: any) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{job.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {job.company || job.author}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-semibold">{selectedJob.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedJob.description}
                </p>
                {selectedJob.budget && (
                  <Badge variant="secondary">{selectedJob.budget}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resume Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5" />
              Select Resume
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose the resume you want to tailor
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume-select">Base Resume</Label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger id="resume-select">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumesLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading resumes...</div>
                  ) : resumes.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No resumes found. Create one first.
                    </div>
                  ) : (
                    resumes.map((resume: any) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTailorBoth}
              disabled={!selectedJobId || !selectedResumeId || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Tailor Resume & Cover Letter
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {(tailoredResume || tailoredCoverLetter) && (
        <Card>
          <CardHeader>
            <CardTitle>Tailored Results</CardTitle>
            <CardDescription>
              Your optimized resume and cover letter for this specific job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="resume">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
              </TabsList>

              <TabsContent value="resume" className="space-y-4">
                {tailoredResume ? (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyResumeToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/dashboard/resumes/${tailoredResume.id}/edit`}>
                          <FileText className="w-4 h-4 mr-2" />
                          View Full Resume
                        </a>
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-semibold mb-2">{tailoredResume.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        This resume has been optimized with keywords and relevant experience highlighted for the selected job.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No tailored resume yet. Click "Tailor Resume & Cover Letter" above.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cover-letter" className="space-y-4">
                {tailoredCoverLetter ? (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyCoverLetterToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">
                      {tailoredCoverLetter.content}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No cover letter yet. Click "Tailor Resume & Cover Letter" above.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
