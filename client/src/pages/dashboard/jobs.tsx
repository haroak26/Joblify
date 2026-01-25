import { useState, useMemo } from "react";
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
  

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const jobsQuery = useQuery<{ jobs: JobPost[] }>({
    queryKey: ["/api/jobs"],
    enabled: (profileQuery.data?.skills?.length ?? 0) > 0,
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

  const hasSkills = profile.skills.length > 0;
  const hasJobs = jobs.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-jobs-heading">
            My Jobs
            {hasJobs && (
              <Badge variant="secondary" className="ml-3 text-sm">
                {jobs.length}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Browse and manage your job opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshJobsMutation.mutate()}
            disabled={refreshJobsMutation.isPending || !hasSkills}
            className="gap-2"
            data-testid="button-refresh-jobs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshJobsMutation.isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {hasJobs && (
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!hasSkills ? (
        <EmptyState type="no-skills" />
      ) : jobsQuery.isLoading ? (
        <JobListSkeleton />
      ) : !hasJobs ? (
        <EmptyState
          type="no-jobs"
          onAction={() => refreshJobsMutation.mutate()}
        />
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

          {filteredJobs.length === 0 ? (
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

      {/* MessageGenerator is no longer used here as it's replaced by the Generator page */}
    </div>
  );
}
