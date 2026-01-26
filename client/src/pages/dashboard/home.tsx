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
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-home-heading">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a quick look at your freelance funnel.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Opportunities", value: jobs.length, icon: Briefcase },
          { label: "Est. Value", value: `$${totalValue.toLocaleString()}`, icon: DollarSign },
          { label: "Saved", value: savedJobs.length, icon: TrendingUp },
          { label: "Applied", value: appliedJobs.length, icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" data-testid={`text-${stat.label.toLowerCase().replace(" ", "-")}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Ready to find work?</h2>
            <p className="text-sm text-muted-foreground">Search social media for freelance opportunities matching your skills.</p>
          </div>
          <Button
            onClick={() => refreshJobsMutation.mutate()}
            disabled={refreshJobsMutation.isPending || !hasSkills}
            className="gap-2"
            data-testid="button-run-finder"
          >
            {refreshJobsMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Find Opportunities
          </Button>
        </div>

        {!hasSkills && (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground border border-dashed">
            Add skills below to start finding opportunities.
          </div>
        )}
      </div>

      <div className="pt-6 border-t">
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
    </div>
  );
}
