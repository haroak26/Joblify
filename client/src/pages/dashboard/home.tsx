import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, DollarSign, Search, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, JobPost, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";


export default function DashboardHome() {
  

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const jobsQuery = useQuery<{ jobs: JobPost[] }>({
    queryKey: ["/api/jobs"],
    enabled: (profileQuery.data?.skills?.length ?? 0) > 0,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: Partial<FreelancerProfile>) => {
      const response = await apiRequest("POST", "/api/profile", profile);
      return response.json();
    },
    onMutate: async (nextProfile) => {
      await queryClient.cancelQueries({ queryKey: ["/api/profile"] });
      const previousProfile = queryClient.getQueryData<FreelancerProfile>(["/api/profile"]);
      const optimisticProfile: FreelancerProfile = {
        intro: nextProfile.intro ?? previousProfile?.intro ?? "",
        skills: nextProfile.skills ?? previousProfile?.skills ?? [],
      };
      queryClient.setQueryData(["/api/profile"], optimisticProfile);
      return { previousProfile };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["/api/profile"], context.previousProfile);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const refreshJobsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/jobs/refresh");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: () => {
      // Error handled by UI
    },
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const jobs = jobsQuery.data?.jobs ?? [];
  const savedJobs = jobs.filter(j => j.saved);
  const appliedJobs = jobs.filter(j => j.applied);

  const totalValue = jobs.reduce((sum, job) => {
    if (job.budget) {
      const match = job.budget.match(/\$?([\d,]+)/);
      if (match) {
        return sum + parseInt(match[1].replace(',', ''));
      }
    }
    return sum;
  }, 0);

  const handleIntroChange = (intro: string) => {
    updateProfileMutation.mutate({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    updateProfileMutation.mutate({ ...profile, skills });
  };

  const hasSkills = profile.skills.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-home-heading">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your freelance opportunities</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Total Opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-jobs">{jobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Estimated Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-value">
              ${totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Saved Jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-saved-jobs">{savedJobs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-applied-jobs">{appliedJobs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Job Finder
          </CardTitle>
          <CardDescription>
            Search social media platforms for freelance opportunities matching your skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => refreshJobsMutation.mutate()}
            disabled={refreshJobsMutation.isPending || !hasSkills}
            size="lg"
            className="gap-2"
            data-testid="button-run-finder"
          >
            {refreshJobsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {refreshJobsMutation.isPending ? "Searching..." : "Run Job Finder"}
          </Button>
          {!hasSkills && (
            <p className="text-sm text-muted-foreground mt-3">
              Add skills below to start finding opportunities
            </p>
          )}
        </CardContent>
      </Card>

      {profileQuery.isLoading ? (
        <SkillsSkeleton />
      ) : (
        <ProfileSetup
          intro={profile.intro}
          skills={profile.skills}
          onIntroChange={handleIntroChange}
          onSkillsChange={handleSkillsChange}
        />
      )}
    </div>
  );
}
