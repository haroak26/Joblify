import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";

export default function AtsScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ats/scan", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to scan");
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">ATS Scanner</h1>
      
      <Card className="p-6">
        <label htmlFor="resume-file-upload" className="block mb-2 font-semibold">
          Upload Resume
        </label>
        <input
          id="resume-file-upload"
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        <Button
          onClick={() => file && scanMutation.mutate(file)}
          disabled={!file || scanMutation.isPending}
        >
          <Upload className="w-4 h-4 mr-2" />
          Scan Resume
        </Button>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">ATS Score: {result.score}/100</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Keywords Found:</h3>
              <p>{result.keywords?.join(", ")}</p>
            </div>
            <div>
              <h3 className="font-semibold">Suggestions:</h3>
              <ul className="list-disc pl-5">
                {result.suggestions?.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
