import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Briefcase, MapPin, DollarSign, Clock, TrendingUp, CheckCircle2, Search, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeatureTracking, FEATURES } from "@/hooks/use-feature-tracking";

export default function JobMatch() {
  // Track feature usage
  useFeatureTracking(FEATURES.JOB_MATCH);
  
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");

  const { data: resumesData } = useQuery<{ resumes: Array<{ id: number; title: string }> }>({
    queryKey: ["/api/resumes"],
  });

  const resumes = resumesData?.resumes || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Job Match
        </h2>
        <p className="text-muted-foreground">
          Find jobs that match your skills and experience
        </p>
      </div>

      {/* Resume Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-body">Select Your Resume</CardTitle>
          <CardDescription>
            Choose a resume to match against available jobs
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
            <Button disabled={!selectedResumeId} size="lg">
              <Search className="w-4 h-4 mr-2" />
              Find Matches
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Section */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-large font-semibold mb-2">Job Matching Coming Soon</h3>
              <p className="text-small text-muted-foreground max-w-md mx-auto">
                We're building an intelligent job matching system that will analyze your resume and
                find the best job opportunities based on your skills, experience, and preferences.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium text-small">Smart Matching</div>
                  <div className="text-small text-muted-foreground">AI-powered job recommendations</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium text-small">Skill Analysis</div>
                  <div className="text-small text-muted-foreground">Match based on your expertise</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium text-small">Real-time Updates</div>
                  <div className="text-small text-muted-foreground">Latest job opportunities</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Job Card (Preview) */}
      <Card className="opacity-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-body">Senior Software Engineer</h3>
                <Badge variant="secondary" className="text-small">92% Match</Badge>
              </div>
              <p className="text-small text-muted-foreground mb-3">
                Tech Company Inc. · Remote
              </p>
              <div className="flex flex-wrap gap-3 text-small text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Remote, USA
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  $120k - $180k
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Full-time
                </div>
              </div>
            </div>
            <Button variant="outline" disabled>
              View Details
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">React</Badge>
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">Node.js</Badge>
            <Badge variant="outline">AWS</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
