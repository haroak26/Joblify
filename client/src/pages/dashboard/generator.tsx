import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Copy, Check, RefreshCw, Briefcase } from "lucide-react";
import type { FreelancerProfile, JobPost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";


type Tone = "professional" | "friendly" | "enthusiastic";
type MessageType = "comment" | "initial";

export default function Generator() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
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
      }
    }
  }, [jobIdFromQuery, jobsQuery.data]);

  useEffect(() => {
    setGeneratedMessage("");
  }, [selectedJobId, messageType, tone]);

  const handleJobSelect = (id: string) => {
    setSelectedJobId(id);
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedJob = jobsQuery.data?.jobs.find(j => j.id.toString() === selectedJobId);
      const response = await apiRequest("POST", "/api/generate-message", {
        jobTitle: selectedJob?.title ?? "Custom Job",
        jobDescription: selectedJob?.description ?? "",
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
  const selectedJob = jobs.find(j => j.id.toString() === selectedJobId);

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 sm:space-y-10 lg:space-y-12 max-w-5xl mx-auto">
      <div className="space-y-8 sm:space-y-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-base font-semibold">Step 1: Select Job</p>
            <Select value={selectedJobId} onValueChange={handleJobSelect}>
              <SelectTrigger className="w-full h-11 px-4" data-testid="select-source-job">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <p className="text-base font-semibold">Step 2: Strategy</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={messageType} onValueChange={(v: MessageType) => setMessageType(v)}>
                <SelectTrigger className="flex-1 h-11 px-4" data-testid="select-message-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Short Comment</SelectItem>
                  <SelectItem value="initial">Outreach Message</SelectItem>
                </SelectContent>
              </Select>
              {messageType === "initial" && (
                <Select value={tone} onValueChange={(v: Tone) => setTone(v)}>
                  <SelectTrigger className="flex-1 h-11 px-4 w-full" data-testid="select-tone">
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

        <div className="space-y-3">
          <p className="text-base font-semibold">Step 3: Review Job</p>
          {selectedJob ? (
            <div className="rounded-xl border bg-muted/30 p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{selectedJob.source.toUpperCase()}</span>
                <span>•</span>
                <span>{selectedJob.postedAt}</span>
              </div>
              <h3 className="text-lg font-semibold">{selectedJob.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedJob.description}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
              Select a job to preview details before generating a message.
            </div>
          )}
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !selectedJob || !hasProfile}
          size="lg"
          className="w-full h-12 text-lg font-semibold shadow-md"
          data-testid="button-generate"
        >
          {generateMutation.isPending ? (
            <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5 mr-3" />
          )}
          Generate {messageType === "comment" ? "Comment" : "Message"}
        </Button>

        {!hasProfile && (
          <p className="text-base text-center text-muted-foreground mt-4">
            Complete your profile to enable AI generation.
          </p>
        )}
      </div>

        {generatedMessage && (
        <div className="pt-12 border-t space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-semibold">Generated Message</h2>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCopy}
              className="gap-3 h-10 px-5 w-full sm:w-auto"
              data-testid="button-copy"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copied" : "Copy Message"}
            </Button>
          </div>
          <div className="p-8 bg-muted/30 border rounded-xl whitespace-pre-wrap text-lg leading-relaxed shadow-inner" data-testid="text-generated-message">
            {generatedMessage}
          </div>
        </div>
      )}
    </div>
  );
}
