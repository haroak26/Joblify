import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AtsScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"joblify" | "upload">("joblify");

  const { data: resumes = [] } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
  });

  const scanJoblifyResumeMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const res = await fetch(`/api/ats/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      if (!res.ok) throw new Error("Failed to scan");
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Scan Your Resume</CardTitle>
          <CardDescription>
            Choose a resume from Joblify or upload an external resume for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as "joblify" | "upload")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="joblify">
                <FileText className="w-4 h-4 mr-2" />
                Joblify Resumes
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="joblify" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resume-select">Select Resume</Label>
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger id="resume-select">
                    <SelectValue placeholder="Choose a resume to scan" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume: any) => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => selectedResumeId && scanJoblifyResumeMutation.mutate(selectedResumeId)}
                disabled={!selectedResumeId || scanJoblifyResumeMutation.isPending}
                className="w-full"
                size="lg"
              >
                {scanJoblifyResumeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning Resume...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Scan Resume
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  id="resume-file-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="resume-file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">PDF or DOCX (max 10MB)</p>
                    </div>
                  </div>
                </label>
              </div>
              
              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="w-5 h-5" />
                  <span className="flex-1 text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
              
              <Button
                onClick={() => file && scanMutation.mutate(file)}
                disabled={!file || scanMutation.isPending}
                className="w-full"
                size="lg"
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning Resume...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Scan Resume
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>ATS Compatibility Score</CardTitle>
              <CardDescription>
                How well your resume is optimized for Applicant Tracking Systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}/100
                </div>
                <p className="text-lg text-muted-foreground mt-2">
                  {getScoreLabel(result.score)}
                </p>
                <Progress value={result.score} className="h-3 mt-4" />
              </div>
            </CardContent>
          </Card>

          {result.keywords && result.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Keywords Found
                </CardTitle>
                <CardDescription>
                  Important keywords detected in your resume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((keyword: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Improvement Suggestions
                </CardTitle>
                <CardDescription>
                  Recommendations to improve your ATS score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.suggestions.map((suggestion: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="flex-1">{suggestion}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
