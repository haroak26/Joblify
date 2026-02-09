import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview/ResumePreview";

interface Resume {
  id: string;
  userId: string;
  title: string;
  template: string;
  resumeData: any;
  createdAt: string;
  updatedAt: string;
}

interface ResumesResponse {
  resumes: Resume[];
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: resumesData, isLoading: resumesLoading } = useQuery<ResumesResponse>({
    queryKey: ["/api/resumes"],
  });

  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData?.resumes) ? resumesData.resumes : [];
  const totalResumes = resumes.length;
  const recentResumes = resumes.slice(0, 3);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Welcome back, {user?.name || user?.username}!</h1>
        <p className="text-sm text-muted-foreground">Create professional resumes with AI-powered tools</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">AI Resume Builder</h3>
              <p className="text-xs text-muted-foreground">Build with AI chat assistance</p>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation("/dashboard/resumes/create")}
            >
              Create <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">My Resumes</h3>
              <p className="text-xs text-muted-foreground">
                {resumesLoading ? "Loading..." : `${totalResumes} resume${totalResumes === 1 ? '' : 's'}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard/resumes")}
            >
              View All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Resumes */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Recent Resumes</h2>
        {totalResumes > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard/resumes")}>
            View all
          </Button>
        )}
      </div>

      {resumesLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : totalResumes === 0 ? (
        <Card className="border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">No resumes yet</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center">
              Get started by creating your first professional resume.
            </p>
            <Button size="sm" onClick={() => setLocation("/dashboard/resumes/create")}>
              <Plus className="w-3 h-3 mr-1" />
              Create Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentResumes.map((resume) => (
            <Card
              key={resume.id}
              className="border cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setLocation(`/dashboard/resume-builder/${resume.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-14 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
                  <div className="scale-[0.1] origin-top-left pointer-events-none">
                    <div style={{ width: '1000%', height: '1000%' }}>
                      <ResumePreview
                        data={resume.resumeData}
                        template={resume.template}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{resume.title}</h3>
                  <p className="text-xs text-muted-foreground">Updated {formatDate(resume.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
