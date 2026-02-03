import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CoverLetterGenerator() {
  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "creative">("professional");
  const [result, setResult] = useState<any>(null);

  const { data: resumes } = useQuery({
    queryKey: ["/api/resumes"],
  });

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Cover Letter Generator</h1>
      
      <Card className="p-6 space-y-4">
        <div>
          <label className="font-semibold">Select Resume</label>
          <Select value={resumeId} onValueChange={setResumeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a resume" />
            </SelectTrigger>
            <SelectContent>
              {resumes?.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="font-semibold">Job Description</label>
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={6}
          />
        </div>

        <div>
          <label className="font-semibold">Tone</label>
          <Select value={tone} onValueChange={(v: any) => setTone(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!resumeId || !jobDescription || generateMutation.isPending}
        >
          Generate Cover Letter
        </Button>
      </Card>

      {result && (
        <Card className="p-6">
          <Textarea value={result.content} rows={20} readOnly />
        </Card>
      )}
    </div>
  );
}
