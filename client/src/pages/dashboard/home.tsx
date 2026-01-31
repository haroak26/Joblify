import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Briefcase, DollarSign, Search, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, JobPost, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";


export default function DashboardHome() {
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);

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
  const refreshSteps = useMemo(() => ["Fetching X", "Fetching Reddit", "Fetching Facebook"], []);

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
  const isProfileComplete = profile.intro.length > 20 && hasSkills;

  useEffect(() => {
    if (!refreshJobsMutation.isPending) {
      setRefreshStatus(null);
      return;
    }

    let stepIndex = 0;
    setRefreshStatus(refreshSteps[stepIndex]);
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % refreshSteps.length;
      setRefreshStatus(refreshSteps[stepIndex]);
    }, 1400);

    return () => clearInterval(interval);
  }, [refreshJobsMutation.isPending, refreshSteps]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 sm:space-y-10 lg:space-y-12 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-home-heading">Dashboard</h1>
        <p className="text-muted-foreground text-base sm:text-lg">Welcome back! Here's a quick look at your freelance funnel.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {[
          { label: "Opportunities", value: jobs.length, icon: Briefcase },
          { label: "Est. Value", value: `$${totalValue.toLocaleString()}`, icon: DollarSign },
          { label: "Saved", value: savedJobs.length, icon: TrendingUp },
          { label: "Applied", value: appliedJobs.length, icon: Clock },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className="w-5 h-5" />
                <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl sm:text-4xl font-bold"
                data-testid={`text-${stat.label.toLowerCase().replace(" ", "-")}`}
              >
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-10 border-t space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 flex-wrap">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Ready to find work?</h2>
            <p className="text-base text-muted-foreground">Search social media for freelance opportunities matching your skills.</p>
          </div>
          <div className="flex flex-col gap-2 items-start w-full sm:w-auto">
            <Button
              onClick={() => refreshJobsMutation.mutate()}
              disabled={refreshJobsMutation.isPending || !hasSkills}
              className="gap-3 px-6 w-full sm:w-auto"
              data-testid="button-run-finder"
            >
              {refreshJobsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Find Opportunities
            </Button>
            {refreshJobsMutation.isPending && (
              <div className="text-sm text-muted-foreground" aria-live="polite">
                {refreshStatus || "Fetching opportunities"} — Please keep this tab open.
              </div>
            )}
          </div>
        </div>

        {!hasSkills && (
          <div className="p-6 bg-muted/50 rounded-xl text-base text-muted-foreground border border-dashed text-center">
            Add skills below to start finding opportunities.
          </div>
        )}
      </div>

      {!isProfileComplete && (
        <div className="pt-10 border-t">
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
      )}
    </div>
  );
}
