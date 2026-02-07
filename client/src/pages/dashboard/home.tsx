import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scan, Mail, ArrowRight, Briefcase, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardHome() {
  const { user } = useAuth();

  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: any[] }>({
    queryKey: ["/api/jobs"],
  });
  
  // Ensure jobs is always an array
  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : [];

  const totalJobs = jobs.length;
  const jobsApplied = jobs.filter((job: any) => job.applied).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.username}!</h1>
        <p className="text-muted-foreground">Track your job applications and search for opportunities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ATS Scanner</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">Available</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scan documents for ATS compatibility
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              ATS Scanner
            </CardTitle>
            <CardDescription>
              Analyze documents for ATS compatibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/ats-scanner">
              <Button className="w-full">
                Scan Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Cover Letters
            </CardTitle>
            <CardDescription>
              Generate professional cover letters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/cover-letter">
              <Button className="w-full">
                Create Letter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Jobs
            </CardTitle>
            <CardDescription>
              Track and manage job applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/jobs">
              <Button className="w-full">
                View Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
