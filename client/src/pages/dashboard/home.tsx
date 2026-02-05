import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Scan, Mail, ArrowRight, Briefcase, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Resume } from "@shared/schema";

export default function DashboardHome() {
  const { user } = useAuth();
  
  const { data: resumesData, isLoading: resumesLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });
  
  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: any[] }>({
    queryKey: ["/api/jobs"],
  });
  
  // Ensure jobs is always an array
  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : [];

  const resumeCount = resumes.length;
  const totalJobs = jobs.length;
  const jobsApplied = jobs.filter((job: any) => job.applied).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-muted-foreground">Build your perfect resume with AI assistance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {resumesLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{resumeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumeCount === 0 ? 'Create your first resume' : `${resumeCount} resume${resumeCount === 1 ? '' : 's'} created`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall ATS Score</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scan for ATS Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalJobs}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalJobs === 0 ? 'No jobs tracked' : `${totalJobs} job${totalJobs === 1 ? '' : 's'} tracked`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Applied For</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{jobsApplied}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {jobsApplied === 0 ? 'No applications yet' : `${jobsApplied} application${jobsApplied === 1 ? '' : 's'}`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <Link href="/dashboard/resumes">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">My Resumes</CardTitle>
              </div>
              <CardDescription>View and manage all your resumes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <Link href="/dashboard/ats-scanner">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">ATS Scanner</CardTitle>
              </div>
              <CardDescription>Optimize your resume for applicant tracking systems</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                Scan resume
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <Link href="/dashboard/cover-letter">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Cover Letters</CardTitle>
              </div>
              <CardDescription>Generate AI-powered cover letters</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-between">
                Create letter
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Resumes */}
      {resumeCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Resumes</CardTitle>
            <CardDescription>Your recently updated resumes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumes.slice(0, 5).map((resume: any) => (
                <Link key={resume.id} href={`/dashboard/resumes/${resume.id}/edit`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{resume.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Updated {new Date(resume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {resumeCount === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-muted-foreground mb-6">
            Get started by creating your first AI-powered resume
          </p>
          <Link href="/dashboard/resumes/new">
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Resume
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
