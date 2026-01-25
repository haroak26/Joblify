import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, Check, RefreshCw, Briefcase } from "lucide-react";
import type { FreelancerProfile, JobPost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";


type Tone = "professional" | "friendly" | "enthusiastic";
type MessageType = "comment" | "initial";

export default function Generator() {
  const [location] = useLocation();
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("custom");
  const [tone, setTone] = useState<Tone>("professional");
  const [messageType, setMessageType] = useState<MessageType>("initial");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const jobIdFromQuery = searchParams.get("jobId");

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const jobsQuery = useQuery<{ jobs: JobPost[] }>({
    queryKey: ["/api/jobs"],
  });

  useEffect(() => {
    if (jobIdFromQuery && jobsQuery.data?.jobs) {
      const job = jobsQuery.data.jobs.find(j => j.id.toString() === jobIdFromQuery);
      if (job) {
        setSelectedJobId(job.id.toString());
        setJobDescription(job.description);
      }
    }
  }, [jobIdFromQuery, jobsQuery.data]);

  const handleJobSelect = (id: string) => {
    setSelectedJobId(id);
    if (id === "custom") {
      setJobDescription("");
    } else {
      const job = jobsQuery.data?.jobs.find(j => j.id.toString() === id);
      if (job) {
        setJobDescription(job.description);
      }
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedJob = jobsQuery.data?.jobs.find(j => j.id.toString() === selectedJobId);
      const response = await apiRequest("POST", "/api/generate-message", {
        jobTitle: selectedJob?.title ?? "Custom Job",
        jobDescription,
        skills: profileQuery.data?.skills.map(s => s.name) ?? [],
        tone,
        messageType,
        intro: profileQuery.data?.intro ?? "",
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedMessage(data.message);
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const hasProfile = profile.intro.length > 0 || profile.skills.length > 0;
  const jobs = jobsQuery.data?.jobs ?? [];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-generator-heading">Message Generator</h1>
        <p className="text-muted-foreground">
          {messageType === "comment" 
            ? "Create short, human-like comments for social media posts"
            : "Create personalized outreach messages for any opportunity"}
        </p>
      </div>

      <Card className="border-sidebar-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Job Details</CardTitle>
          <CardDescription>
            Select a scraped job or paste details manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Source Job</span>
            <Select value={selectedJobId} onValueChange={handleJobSelect}>
              <SelectTrigger className="w-full bg-muted/30" data-testid="select-source-job">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Input (Manual)</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea
              placeholder="Paste the job posting or describe the opportunity here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="resize-none bg-muted/30 focus-visible:ring-1"
              data-testid="textarea-job-description"
              disabled={selectedJobId !== "custom"}
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message Type</span>
              <Select value={messageType} onValueChange={(v: MessageType) => setMessageType(v)}>
                <SelectTrigger className="w-full bg-muted/30" data-testid="select-message-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Social Media Comment</SelectItem>
                  <SelectItem value="initial">Outreach Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {messageType === "initial" && (
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</span>
                <Select value={tone} onValueChange={(v: Tone) => setTone(v)}>
                  <SelectTrigger className="w-full bg-muted/30" data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !jobDescription.trim() || !hasProfile}
              className="w-full gap-2 h-11 text-base font-medium shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate {messageType === "comment" ? "Comment" : "Message"}
            </Button>
          </div>

          {!hasProfile && (
            <p className="text-sm text-center text-muted-foreground/80 mt-2">
              Add your profile details in the Profile section first
            </p>
          )}
        </CardContent>
      </Card>

      {generatedMessage && (
        <Card className="border-sidebar-border/50 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">Generated Output</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2 h-8"
                data-testid="button-copy"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-5 bg-muted/40 border rounded-lg whitespace-pre-wrap text-[15px] leading-relaxed" data-testid="text-generated-message">
              {generatedMessage}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
