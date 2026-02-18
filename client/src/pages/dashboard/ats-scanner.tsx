import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, XCircle, Target, BarChart3, Search, Lightbulb, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CleanTabs, CleanTabsContent, CleanTabsList, CleanTabsTrigger } from "@/components/ui/clean-tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";
import { getCsrfToken } from "@/lib/queryClient";
import { UpgradeDialog } from "@/components/UpgradeDialog";

const loadingSteps = [
  "Searching through your resume",
  "Analyzing ATS pain points",
  "Compiling personalized findings",
];

export default function AtsScanner() {
  // Track feature usage
  useFeatureTracking(FEATURES.ATS_SCANNER);
  
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"joblify" | "upload">("upload");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<any>(null);
  const { toast } = useToast();

  // Query to fetch user's Joblify resumes
  const { data: resumes = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/resumes"],
    enabled: scanMode === "joblify",
  });
  const { data: usageData } = useQuery<any>({ queryKey: ["/api/usage"] });

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/ats/scan", {
        method: "POST",
        body: formData,
        headers,
      });
      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        const error: any = new Error(err.message || "Failed to scan");
        error.code = err.code;
        error.upgradeModal = err.upgradeModal;
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Scan Complete", description: `ATS Score: ${data.score}/100` });
    },
    onError: (error: any) => {
      if (error?.code === "ATS_SCAN_LIMIT") {
        setUpgradeContext(error?.upgradeModal ?? null);
        setShowUpgradeDialog(true);
        return;
      }
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const scanJoblifyResumeMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch(`/api/ats/scan-resume/${resumeId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ jobDescription: jobDescription.trim() || undefined }),
      });
      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        const error: any = new Error(err.message || "Failed to scan");
        error.code = err.code;
        error.upgradeModal = err.upgradeModal;
        throw error;
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Scan Complete", description: `ATS Score: ${data.score}/100` });
    },
    onError: (error: any) => {
      if (error?.code === "ATS_SCAN_LIMIT") {
        setUpgradeContext(error?.upgradeModal ?? null);
        setShowUpgradeDialog(true);
        return;
      }
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent – Highly ATS Optimized";
    if (score >= 80) return "Very Good – ATS Friendly";
    if (score >= 70) return "Good – Minor Improvements Needed";
    if (score >= 60) return "Fair – Several Areas to Improve";
    if (score >= 40) return "Poor – Significant Changes Needed";
    return "Critical – Major Overhaul Required";
  };

  const getCategoryScore = (category: any) => {
    const score = category?.score || 0;
    if (score >= 80) return { color: "text-green-600", bg: "bg-green-100", icon: CheckCircle };
    if (score >= 60) return { color: "text-yellow-600", bg: "bg-yellow-100", icon: AlertCircle };
    return { color: "text-red-600", bg: "bg-red-100", icon: XCircle };
  };

  const isScanning = scanJoblifyResumeMutation.isPending || scanMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          ATS Resume Scanner
        </h2>
        <p className="text-muted-foreground">
          Deep analysis of your resume's ATS compatibility with actionable insights
        </p>
        {usageData?.thresholds?.atsScans?.stage === "notice_70" && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You’re getting close to your monthly limit.
          </div>
        )}
        {usageData?.thresholds?.atsScans?.stage === "cta_90" && (
          <div className="mt-3 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900">
            You’re almost out of ATS scans this month. Compare plans to avoid interruptions.
          </div>
        )}
      </div>

      {/* Scan Configuration */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Resume selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-body">Select Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CleanTabs value={scanMode} onValueChange={(value) => setScanMode(value as "joblify" | "upload")}>
              <CleanTabsList className="mb-4">
                <CleanTabsTrigger value="joblify">
                  <FileText className="w-4 h-4 mr-2" />
                  Joblify Resumes
                </CleanTabsTrigger>
                <CleanTabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </CleanTabsTrigger>
              </CleanTabsList>
              
              <CleanTabsContent value="joblify" className="space-y-3">
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume to scan" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.length === 0 ? (
                      <div className="p-2 text-small text-muted-foreground">
                        No resumes found. Create one first.
                      </div>
                    ) : (
                      resumes.map((resume: any) => (
                        <SelectItem key={resume.id} value={resume.id.toString()}>
                          {resume.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CleanTabsContent>
              
              <CleanTabsContent value="upload" className="space-y-3">
                <div className="border border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    id="resume-file-upload"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="resume-file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium text-small">Click to upload</p>
                    <p className="text-small text-muted-foreground">PDF or DOCX (max 10MB)</p>
                  </label>
                </div>
                {file && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="w-4 h-4" />
                    <span className="flex-1 text-small truncate">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                  </div>
                )}
              </CleanTabsContent>
            </CleanTabs>
          </CardContent>
        </Card>

        {/* Right: Job description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-body flex items-center gap-2">
              <Target className="w-4 h-4" />
              Job Description
              <Badge variant="secondary" className="text-small">Recommended</Badge>
            </CardTitle>
            <CardDescription>
              Paste a job description for targeted keyword matching and gap analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for a more accurate and targeted ATS analysis..."
              rows={6}
              className="resize-none"
            />
            {jobDescription && (
              <p className="text-small text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Job description provided – analysis will include targeted keyword matching
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan Button */}
      <Button
        onClick={() => {
          if (scanMode === "joblify" && selectedResumeId) {
            scanJoblifyResumeMutation.mutate(selectedResumeId);
          } else if (scanMode === "upload" && file) {
            scanMutation.mutate(file);
          }
        }}
        disabled={isScanning || (scanMode === "joblify" ? !selectedResumeId : !file)}
        className="w-full"
        size="lg"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Performing Deep Analysis...
          </>
        ) : (
          <>
            <BarChart3 className="w-4 h-4 mr-2" />
            Run ATS Analysis
          </>
        )}
      </Button>

      {isScanning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h3 className="text-base font-semibold">Running ATS analysis...</h3>
            </div>
            <div className="space-y-3">
              {loadingSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-md bg-background/70 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground/90">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Overall Score Card */}
          <Card className={`border ${getScoreBgColor(result.score)}`}>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-center">
                  <div className={`text-7xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <p className="text-small text-muted-foreground mt-1">out of 100</p>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-large font-medium">{getScoreLabel(result.score)}</h3>
                  <Progress value={result.score} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 text-center text-small">
                    <div>
                      <div className="font-medium text-green-600">{result.keywords?.length || 0}</div>
                      <div className="text-muted-foreground">Keywords Found</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">{result.missingKeywords?.length || 0}</div>
                      <div className="text-muted-foreground">Missing Keywords</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600">{result.suggestions?.length || 0}</div>
                      <div className="text-muted-foreground">Improvements</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {result.categories && result.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Detailed Analysis Breakdown
                </CardTitle>
                <CardDescription>
                  Section-by-section evaluation of your resume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.categories.map((cat: any, i: number) => {
                  const style = getCategoryScore(cat);
                  const Icon = style.icon;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${style.color}`} />
                          <span className="font-medium text-small">{cat.name}</span>
                        </div>
                        <span className={`font-medium text-small ${style.color}`}>{cat.score}/100</span>
                      </div>
                      <Progress value={cat.score} className="h-2" />
                      {cat.feedback && (
                        <p className="text-small text-muted-foreground pl-6">{cat.feedback}</p>
                      )}
                      {i < result.categories.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Keywords Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            {result.keywords && result.keywords.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-body flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Keywords Found ({result.keywords.length})
                  </CardTitle>
                  <CardDescription>
                    These important keywords were detected in your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.missingKeywords && result.missingKeywords.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-body flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Missing Keywords ({result.missingKeywords.length})
                  </CardTitle>
                  <CardDescription>
                    Consider adding these keywords to improve your ATS score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        + {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Improvement Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  Actionable Improvements
                </CardTitle>
                <CardDescription>
                  Specific recommendations to improve your ATS compatibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.suggestions.map((suggestion: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-small font-medium">
                        {i + 1}
                      </div>
                      <p className="flex-1 text-small">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-body flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                ATS Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3 text-small">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Use standard section headers: Experience, Education, Skills</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Avoid tables, columns, and complex formatting</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Include exact keywords from the job description</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Use bullet points with quantified achievements</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Keep file format as PDF for best compatibility</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Start bullet points with strong action verbs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="ATS scans"
        currentPlan={usageData?.plan || "free"}
        limit={usageData?.limits?.maxATSScans}
        current={usageData?.usage?.atsScansThisMonth}
        unlockedAmount={upgradeContext?.unlockedAmount}
        recommendedPlanName={upgradeContext?.recommendedPlan ? String(upgradeContext.recommendedPlan).charAt(0).toUpperCase() + String(upgradeContext.recommendedPlan).slice(1) : null}
      />
    </div>
  );
}
