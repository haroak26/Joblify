import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Plus, Sparkles, CheckCircle2, Circle, Target, Search, FileEdit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview/ResumePreview";
import { Skeleton } from "@/components/ui/skeleton";

interface Resume {
  id: string;
  userId: string;
  title: string;
  template: string;
  resumeData: any;
  createdAt: string;
  updatedAt: string;
}

interface OnboardingStatus {
  hasCreatedResume: boolean;
  hasCreatedCoverLetter: boolean;
  hasGottenATSScore: boolean;
}

interface ResumeLimits {
  canCreate: boolean;
  limit: number;
  current: number;
  plan: string;
  aiAccessBlocked: boolean;
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: resumesData, isLoading: resumesLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  const { data: onboardingStatus } = useQuery<OnboardingStatus>({
    queryKey: ["/api/user/onboarding-status"],
  });

  // Fetch resume limits
  const { data: limits } = useQuery<ResumeLimits>({
    queryKey: ["/api/resumes/limits"],
  });

  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData) ? resumesData : [];
  const totalResumes = resumes.length;
  const recentResumes = resumes.slice(0, 3);

  // Check if AI should be hidden (limit reached or AI blocked)
  const shouldHideAI = limits && (!limits.canCreate || limits.aiAccessBlocked);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate onboarding progress
  const onboardingTasks = [
    {
      id: "resume",
      title: "Create your first resume",
      description: "Build a professional resume with AI assistance",
      completed: onboardingStatus?.hasCreatedResume ?? false,
      action: () => setLocation("/dashboard/resumes/create"),
      icon: FileText,
    },
    {
      id: "cover-letter",
      title: "Create your first cover letter",
      description: "Generate a tailored cover letter for any job",
      completed: onboardingStatus?.hasCreatedCoverLetter ?? false,
      action: () => setLocation("/dashboard/cover-letter"),
      icon: FileEdit,
    },
    {
      id: "ats-score",
      title: "Get your ATS score",
      description: "See how well your resume passes ATS systems",
      completed: onboardingStatus?.hasGottenATSScore ?? false,
      action: () => setLocation("/dashboard/ats-scanner"),
      icon: Search,
    },
  ];

  const completedTasks = onboardingTasks.filter(task => task.completed).length;
  const totalTasks = onboardingTasks.length;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Welcome back, {user?.name || user?.username}!</h1>
        <p className="text-sm text-muted-foreground">Create professional resumes with AI-powered tools</p>
      </div>

      {/* Onboarding Checklist - Only show if not all tasks are completed */}
      {completedTasks < totalTasks && (
        <Card className="mb-8 border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Quick Start Guide</CardTitle>
                  <CardDescription className="text-xs">
                    {completedTasks} of {totalTasks} completed
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{progressPercentage}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {onboardingTasks.map((task) => {
                const Icon = task.icon;
                return (
                  <button
                    key={task.id}
                    className={`flex flex-col gap-2 p-3 rounded-lg border transition-all text-left ${
                      task.completed
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 cursor-default"
                        : "bg-background border-border hover:border-primary/50 cursor-pointer"
                    }`}
                    onClick={task.completed ? undefined : task.action}
                    disabled={task.completed}
                    aria-label={task.completed ? `${task.title} - Completed` : task.title}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        task.completed ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                      }`}>
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <h4 className={`text-sm font-medium flex-1 ${task.completed ? "text-green-700 dark:text-green-300" : ""}`}>
                        {task.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* AI Resume Builder - Only show if not at limit and AI not blocked */}
        {!shouldHideAI && (
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
        )}

        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">My Resumes</h3>
              {resumesLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {totalResumes} resume{totalResumes === 1 ? '' : 's'}
                </p>
              )}
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

        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">Cover Letter</h3>
              <p className="text-xs text-muted-foreground">Generate tailored letters</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard/cover-letter")}
            >
              Create
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">ATS Scanner</h3>
              <p className="text-xs text-muted-foreground">Check resume compatibility</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard/ats-scanner")}
            >
              Scan
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">Job Match</h3>
              <p className="text-xs text-muted-foreground">Find perfect job matches</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard/job-match")}
            >
              Explore
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
