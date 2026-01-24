import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  RefreshCw, 
  Settings2, 
  LayoutGrid, 
  List,
  ChevronLeft
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SkillsManager } from "@/components/skills-manager";
import { JobCard } from "@/components/job-card";
import { JobFilters, type SourceFilter, type StatusFilter } from "@/components/job-filters";
import { MessageGenerator } from "@/components/message-generator";
import { EmptyState } from "@/components/empty-state";
import { JobListSkeleton, SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, JobPost } from "@shared/schema";
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

  const skillsQuery = useQuery<{ skills: Skill[] }>({
    queryKey: ["/api/skills"],
  });

  const jobsQuery = useQuery<{ jobs: JobPost[] }>({
    queryKey: ["/api/jobs"],
    enabled: (skillsQuery.data?.skills?.length ?? 0) > 0,
  });

  const updateSkillsMutation = useMutation({
    mutationFn: async (skills: Skill[]) => {
      const response = await apiRequest("POST", "/api/skills", { skills });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
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

  const skills = skillsQuery.data?.skills ?? [];
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

  const handleSkillsChange = (newSkills: Skill[]) => {
    updateSkillsMutation.mutate(newSkills);
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

  const isLoading = skillsQuery.isLoading;
  const hasSkills = skills.length > 0;
  const hasJobs = jobs.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg hidden sm:inline" data-testid="text-dashboard-logo">Joblify</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshJobsMutation.mutate()}
              disabled={refreshJobsMutation.isPending || !hasSkills}
              className="gap-2"
              data-testid="button-refresh-jobs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshJobsMutation.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="jobs" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="jobs" className="gap-2" data-testid="tab-jobs">
                <Briefcase className="w-4 h-4" />
                Jobs
                {hasJobs && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {jobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-2" data-testid="tab-skills">
                <Settings2 className="w-4 h-4" />
                Skills
                {hasSkills && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {skills.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {hasJobs && (
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
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
                        ? "grid sm:grid-cols-2 gap-4"
                        : "space-y-4"
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

          <TabsContent value="skills">
            {isLoading ? (
              <SkillsSkeleton />
            ) : (
              <SkillsManager
                skills={skills}
                onSkillsChange={handleSkillsChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MessageGenerator
        job={selectedJob}
        skills={skills.map((s) => s.name)}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
