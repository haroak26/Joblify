import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { JobFilters, type SourceFilter, type StatusFilter } from "@/components/job-filters";
import { EmptyState } from "@/components/empty-state";
import { JobListSkeleton } from "@/components/loading-skeleton";
import type { JobPost, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";


export default function MyJobs() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const jobsQuery = useQuery<{ jobs: JobPost[] }>({
    queryKey: ["/api/jobs"],
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
    },
    onError: () => {
      // Error handled by UI
    },
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const jobs = jobsQuery.data?.jobs ?? [];
  const refreshSteps = useMemo(() => ["Fetching X", "Fetching Reddit", "Fetching Facebook"], []);

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

  const handleSaveJob = (jobId: string) => {
    saveJobMutation.mutate(jobId);
  };

  const handleGenerateMessage = (job: JobPost) => {
    setLocation(`/dashboard/generator?jobId=${job.id}`);
  };

  const handleMessageSent = (jobId: string) => {
    markAppliedMutation.mutate(jobId);
  };

  const handleApplyJob = (jobId: string) => {
    markAppliedMutation.mutate(jobId);
  };

  const hasSkills = profile.skills.length > 0;
  const hasJobs = jobs.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 sm:space-y-10 lg:space-y-12 max-w-5xl mx-auto">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 flex-wrap">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-jobs-heading">
            My Jobs
            {hasJobs && (
              <span className="block sm:inline sm:ml-4 text-muted-foreground font-normal text-lg sm:text-xl">
                ({jobs.length})
              </span>
            )}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">Find and track opportunities that match your skills.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => refreshJobsMutation.mutate()}
            disabled={refreshJobsMutation.isPending || !hasSkills}
            className="gap-3 h-11 px-5 w-full sm:w-auto"
            data-testid="button-refresh-jobs"
          >
            <RefreshCw className={`w-5 h-5 ${refreshJobsMutation.isPending ? "animate-spin" : ""}`} />
            Refresh List
          </Button>
          {refreshJobsMutation.isPending && (
            <div className="text-sm text-muted-foreground" aria-live="polite">
              {refreshStatus || "Fetching opportunities"} — Please keep this tab open.
            </div>
          )}
          {hasJobs && (
            <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20 w-full sm:w-auto justify-center sm:justify-start">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <JobListSkeleton />
      ) : !hasSkills && !hasJobs ? (
        <EmptyState type="no-skills" />
      ) : !hasJobs ? (
        <EmptyState
          type="no-jobs"
          onAction={() => refreshJobsMutation.mutate()}
        />
      ) : (
        <div className="space-y-10">
          <div className="border-b pb-8">
            <JobFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sourceFilter={sourceFilter}
              onSourceChange={setSourceFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              jobCount={filteredJobs.length}
            />
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState type="no-results" />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid sm:grid-cols-2 gap-8"
                  : "space-y-8"
              }
              data-testid="job-list"
            >
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSave={handleSaveJob}
                  onApply={handleApplyJob}
                  onGenerateMessage={handleGenerateMessage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
