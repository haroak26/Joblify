import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function ResumeEditor() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: resume } = useQuery<any>({
    queryKey: [`/api/resumes/${id}`],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${id}`] });
    },
  });

  const downloadPdf = async () => {
    const res = await fetch(`/api/export/pdf/${id}`, { method: "POST" });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.pdf";
    a.click();
  };

  if (!resume) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Resume</h1>
        <Button onClick={downloadPdf}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <Input
          defaultValue={resume.title}
          placeholder="Resume Title"
          onBlur={(e) => updateMutation.mutate({ title: e.target.value })}
        />
        
        <div>
          <label className="font-semibold">Personal Info</label>
          <Input
            defaultValue={resume.resumeData?.personalInfo?.name}
            placeholder="Full Name"
            className="mt-2"
          />
          <Input
            defaultValue={resume.resumeData?.personalInfo?.email}
            placeholder="Email"
            className="mt-2"
          />
        </div>

        <div>
          <label className="font-semibold">Summary</label>
          <Textarea
            defaultValue={resume.resumeData?.summary}
            placeholder="Professional summary..."
            className="mt-2"
            rows={4}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Full editor coming soon. For now, use the chat interface to build your resume.
        </p>
      </Card>
    </div>
  );
}
