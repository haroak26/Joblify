import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Target, Briefcase, MapPin, DollarSign, Clock, TrendingUp, CheckCircle2, Search, FileText, Loader2, Upload, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MatchResult {
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  keywordMatches: string[];
  experienceMatch: string;
  educationMatch: string;
}

export default function JobMatch() {
  // Track feature usage
  useFeatureTracking(FEATURES.JOB_MATCH);
  
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const { toast } = useToast();

  const { data: resumesData } = useQuery<{ resumes: Array<{ id: number; title: string }> }>({
    queryKey: ["/api/resumes"],
  });

  const resumes = resumesData?.resumes || (Array.isArray(resumesData) ? resumesData : []);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/job-match/analyze", {
        resumeId: selectedResumeId,
        jobDescription,
      });
      return response.json();
    },
    onSuccess: (data: MatchResult) => {
      setMatchResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze job match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Job Match
        </h2>
        <p className="text-muted-foreground">
          Analyze how well your resume matches a job description
        </p>
      </div>

      {/* Resume Selection & Job Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-body">Match Your Resume</CardTitle>
          <CardDescription>
            Select a resume and paste a job description to see how well you match
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a resume to analyze" />
              </SelectTrigger>
              <SelectContent>
                {resumes.length === 0 ? (
                  <div className="p-2 text-small text-muted-foreground">
                    No resumes found. Create one first.
                  </div>
                ) : (
                  resumes.map((resume: any) => (
                    <SelectItem key={resume.id} value={resume.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {resume.title}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[150px]"
          />

          <Button
            disabled={!selectedResumeId || jobDescription.length < 20 || analyzeMutation.isPending}
            size="lg"
            onClick={() => analyzeMutation.mutate()}
            className="w-full"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Analyze Match
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Match Results */}
      {matchResult && (
        <>
          {/* Overall Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Match Score</h3>
                  <p className="text-sm text-muted-foreground">{matchResult.summary}</p>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(matchResult.matchScore)}`}>
                    {matchResult.matchScore}%
                  </div>
                  <Badge variant={getScoreBadgeVariant(matchResult.matchScore)}>
                    {matchResult.matchScore >= 80 ? "Strong Match" : matchResult.matchScore >= 60 ? "Moderate Match" : "Weak Match"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Analysis */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Matched Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {matchResult.matchedSkills.length > 0 ? (
                    matchResult.matchedSkills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="border-green-300 text-green-700">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No matched skills identified</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Missing Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {matchResult.missingSkills.length > 0 ? (
                    matchResult.missingSkills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="border-orange-300 text-orange-700">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No missing skills — great coverage!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {matchResult.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {matchResult.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Experience & Education Match */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Experience Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{matchResult.experienceMatch}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-body flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Education Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{matchResult.educationMatch}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
