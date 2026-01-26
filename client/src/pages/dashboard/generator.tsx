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
    <div className="p-6 space-y-10 max-w-3xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-generator-heading">Message Generator</h1>
        <p className="text-muted-foreground">Personalized outreach and social media engagement.</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Step 1: Select Job</p>
            <Select value={selectedJobId} onValueChange={handleJobSelect}>
              <SelectTrigger className="w-full" data-testid="select-source-job">
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
            <p className="text-sm font-semibold">Step 2: Strategy</p>
            <div className="flex gap-2">
              <Select value={messageType} onValueChange={(v: MessageType) => setMessageType(v)}>
                <SelectTrigger className="flex-1" data-testid="select-message-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Short Comment</SelectItem>
                  <SelectItem value="initial">Outreach Message</SelectItem>
                </SelectContent>
              </Select>
              {messageType === "initial" && (
                <Select value={tone} onValueChange={(v: Tone) => setTone(v)}>
                  <SelectTrigger className="flex-1" data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Step 3: Description</p>
          <Textarea
            placeholder="Paste job details here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            className="resize-none"
            data-testid="textarea-job-description"
            disabled={selectedJobId !== "custom"}
          />
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !jobDescription.trim() || !hasProfile}
          className="w-full h-11 text-base font-semibold"
          data-testid="button-generate"
        >
          {generateMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          Generate {messageType === "comment" ? "Comment" : "Message"}
        </Button>

        {!hasProfile && (
          <p className="text-sm text-center text-muted-foreground">
            Complete your profile to enable AI generation.
          </p>
        )}
      </div>

      {generatedMessage && (
        <div className="pt-10 border-t space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Message</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              data-testid="button-copy"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="p-5 bg-muted/30 border rounded-lg whitespace-pre-wrap text-base leading-relaxed" data-testid="text-generated-message">
            {generatedMessage}
          </div>
        </div>
      )}
    </div>
  );
}
