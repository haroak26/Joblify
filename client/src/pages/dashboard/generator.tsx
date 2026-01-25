import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, Check, RefreshCw } from "lucide-react";
import type { FreelancerProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";


type Tone = "professional" | "friendly" | "enthusiastic";

export default function Generator() {
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-message", {
        jobTitle: "Custom Job",
        jobDescription,
        skills: profileQuery.data?.skills.map(s => s.name) ?? [],
        tone,
        intro: profileQuery.data?.intro ?? "",
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedMessage(data.message);
    },
    onError: () => {
      // Error handled by UI
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const hasProfile = profile.intro.length > 0 || profile.skills.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-generator-heading">Message Generator</h1>
        <p className="text-muted-foreground">Create personalized outreach messages for any opportunity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Paste the job description or requirements you want to respond to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste the job posting or describe the opportunity here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            className="resize-none"
            data-testid="textarea-job-description"
          />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tone:</span>
              <Select value={tone} onValueChange={(v: Tone) => setTone(v)}>
                <SelectTrigger className="w-40" data-testid="select-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !jobDescription.trim() || !hasProfile}
              className="gap-2"
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate Message
            </Button>
          </div>
          {!hasProfile && (
            <p className="text-sm text-muted-foreground">
              Add your introduction or skills in the Account section first
            </p>
          )}
        </CardContent>
      </Card>

      {generatedMessage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Generated Message</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
                data-testid="button-copy"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm" data-testid="text-generated-message">
              {generatedMessage}
            </div>
          </CardContent>
        </Card>
      )}

      {profile.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
            <CardDescription>These will be highlighted in your message</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill.id} variant="secondary">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
