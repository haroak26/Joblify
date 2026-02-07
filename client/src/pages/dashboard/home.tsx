import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DashboardHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: resumesData, isLoading: resumesLoading } = useQuery<{ resumes: any[] }>({
    queryKey: ["/api/resumes"],
  });

  const createResumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resumes", {
        title: "My Resume",
        template: "modern",
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLocation(`/dashboard/resume-builder/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create resume. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData?.resumes) ? resumesData.resumes : [];
  const totalResumes = resumes.length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-header font-bold mb-2">Welcome back, {user?.name || user?.username}!</h1>
        <p className="text-body text-muted-foreground">Create professional resumes with AI-powered tools</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">My Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {resumesLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-large font-bold">{totalResumes}</div>
                <p className="text-small text-muted-foreground mt-1">
                  {totalResumes === 0 ? 'Create your first resume' : `${totalResumes} resume${totalResumes === 1 ? '' : 's'} created`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">ATS Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-large font-bold text-muted-foreground">Available</div>
            <p className="text-small text-muted-foreground mt-1">
              Scan documents for ATS compatibility
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Cover Letters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-large font-bold text-muted-foreground">Ready</div>
            <p className="text-small text-muted-foreground mt-1">
              Generate professional cover letters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-large font-semibold">Resume Builder</CardTitle>
            <CardDescription className="text-small">
              Create ATS-optimized resumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => createResumeMutation.mutate()}
              disabled={createResumeMutation.isPending}
            >
              {createResumeMutation.isPending ? "Creating..." : "Build Resume"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-large font-semibold">ATS Scanner</CardTitle>
            <CardDescription className="text-small">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-large font-semibold">Cover Letters</CardTitle>
            <CardDescription className="text-small">
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
      </div>
    </div>
  );
}
