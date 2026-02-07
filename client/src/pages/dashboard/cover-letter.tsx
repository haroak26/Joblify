import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Download, Loader2, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Resume } from "@shared/schema";

export default function CoverLetterGenerator() {
  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "creative">("professional");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: resumesData } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });
  
  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobDescription, tone }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const copyToClipboard = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      toast({
        title: "Copied!",
        description: "Cover letter copied to clipboard",
      });
    }
  };

  const downloadAsText = () => {
    if (result?.content) {
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Downloaded!",
        description: "Cover letter saved as text file",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-large font-semibold mb-2">Generate Your Cover Letter</h2>
          <p className="text-small text-muted-foreground">
            Fill in the details below to create a tailored cover letter
          </p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume-select">Select Resume *</Label>
            <Select value={resumeId} onValueChange={setResumeId}>
              <SelectTrigger id="resume-select">
                <SelectValue placeholder="Choose a resume to base your letter on" />
              </SelectTrigger>
              <SelectContent>
                {resumes.length === 0 ? (
                  <div className="p-2 text-small text-muted-foreground">
                    No resumes found. Create one first.
                  </div>
                ) : (
                  resumes.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {r.title}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-description">Job Description *</Label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here, including requirements, responsibilities, and company information..."
              rows={8}
              className="font-mono text-small"
            />
            <p className="text-small text-muted-foreground">
              Include as much detail as possible for a more tailored cover letter
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone-select">Writing Tone *</Label>
            <Select value={tone} onValueChange={(v: any) => setTone(v)}>
              <SelectTrigger id="tone-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div>
                    <div className="font-medium">Professional</div>
                    <div className="text-small text-muted-foreground">Formal and business-oriented</div>
                  </div>
                </SelectItem>
                <SelectItem value="enthusiastic">
                  <div>
                    <div className="font-medium">Enthusiastic</div>
                    <div className="text-small text-muted-foreground">Energetic and passionate</div>
                  </div>
                </SelectItem>
                <SelectItem value="creative">
                  <div>
                    <div className="font-medium">Creative</div>
                    <div className="text-small text-muted-foreground">Unique and expressive</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!resumeId || !jobDescription || generateMutation.isPending}
            className="w-full"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Cover Letter...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Cover Letter</CardTitle>
                <CardDescription>
                  AI-generated cover letter based on your inputs
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsText}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={result.content} 
              rows={24}
              readOnly
              className="font-serif text-small leading-relaxed"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
