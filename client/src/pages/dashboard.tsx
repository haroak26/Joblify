import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  RefreshCw, 
  User,
  LayoutGrid, 
  List,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileSetup } from "@/components/profile-setup";
import { JobCard } from "@/components/job-card";
import { JobFilters, type SourceFilter, type StatusFilter } from "@/components/job-filters";
import { MessageGenerator } from "@/components/message-generator";
import { EmptyState } from "@/components/empty-state";
import { JobListSkeleton, SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, JobPost, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/save`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const markAppliedMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/apply`);
      return response.json();
    },
    onSuccess: () => {
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
      toast({
        title: "Jobs Refreshed",
        description: "We've found new opportunities for you!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh jobs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const jobs = jobsQuery.data?.jobs ?? [];

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (sourceFilter !== "all" && job.source !== sourceFilter) return false;
      if (statusFilter === "saved" && !job.saved) return false;
      if (statusFilter === "applied" && !job.applied) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.matchedSkills.some((s) => s.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [jobs, sourceFilter, statusFilter, searchQuery]);

  const handleIntroChange = (intro: string) => {
    updateProfileMutation.mutate({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    updateProfileMutation.mutate({ ...profile, skills });
  };

  const handleSaveJob = (jobId: string) => {
    saveJobMutation.mutate(jobId);
  };

  const handleGenerateMessage = (job: JobPost) => {
    setSelectedJob(job);
    setMessageDialogOpen(true);
  };

  const handleMessageSent = (jobId: string) => {
    markAppliedMutation.mutate(jobId);
  };

  const isLoading = profileQuery.isLoading;
  const hasSkills = profile.skills.length > 0;
  const hasJobs = jobs.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-lg" data-testid="button-back">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl hidden sm:inline" data-testid="text-dashboard-logo">Joblify</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => refreshJobsMutation.mutate()}
              disabled={refreshJobsMutation.isPending || !hasSkills}
              className="gap-2 rounded-lg"
              data-testid="button-refresh-jobs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshJobsMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="jobs" className="space-y-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="h-11 p-1 rounded-lg">
              <TabsTrigger value="jobs" className="gap-2 rounded-md px-4 h-9" data-testid="tab-jobs">
                <Briefcase className="w-4 h-4" />
                Jobs
                {hasJobs && (
                  <Badge variant="secondary" className="ml-1 text-xs rounded-md">
                    {jobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 rounded-md px-4 h-9" data-testid="tab-profile">
                <User className="w-4 h-4" />
                Profile
                {hasSkills && (
                  <Badge variant="secondary" className="ml-1 text-xs rounded-md">
                    {profile.skills.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {hasJobs && (
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="jobs" className="space-y-6">
            {isLoading ? (
              <JobListSkeleton />
            ) : !hasSkills ? (
              <EmptyState type="no-skills" />
            ) : (
              <>
                <JobFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sourceFilter={sourceFilter}
                  onSourceChange={setSourceFilter}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  jobCount={filteredJobs.length}
                />

                {jobsQuery.isLoading ? (
                  <JobListSkeleton />
                ) : !hasJobs ? (
                  <EmptyState
                    type="no-jobs"
                    onAction={() => refreshJobsMutation.mutate()}
                  />
                ) : filteredJobs.length === 0 ? (
                  <EmptyState type="no-results" />
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid sm:grid-cols-2 gap-5"
                        : "space-y-5"
                    }
                    data-testid="job-list"
                  >
                    {filteredJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onSave={handleSaveJob}
                        onGenerateMessage={handleGenerateMessage}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="profile">
            {isLoading ? (
              <SkillsSkeleton />
            ) : (
              <ProfileSetup
                intro={profile.intro}
                skills={profile.skills}
                onIntroChange={handleIntroChange}
                onSkillsChange={handleSkillsChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MessageGenerator
        job={selectedJob}
        skills={profile.skills.map((s) => s.name)}
        intro={profile.intro}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
