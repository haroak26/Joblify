import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, List, RefreshCw, Calendar } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { JobFilters, type SourceFilter, type StatusFilter, type TimeFilter } from "@/components/job-filters";
import { EmptyState } from "@/components/empty-state";
import { JobListSkeleton } from "@/components/loading-skeleton";
import { ScrapeLoadingScreen } from "@/components/scrape-loading-screen";
import type { JobPost, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseApiError } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ScrapeStatus = {
  step: "idle" | "defining" | "x" | "reddit" | "complete" | "error";
  label: string;
};

type TimeSection = "today" | "yesterday" | "week" | "month" | "year" | "older";

function getTimeSection(scrapedAt: Date | string | undefined): TimeSection {
  if (!scrapedAt) return "older";
  
  const date = typeof scrapedAt === "string" ? new Date(scrapedAt) : scrapedAt;
  if (isNaN(date.getTime())) return "older";
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  
  if (date >= today) return "today";
  if (date >= yesterday) return "yesterday";
  if (date >= weekAgo) return "week";
  if (date >= monthAgo) return "month";
  if (date >= yearAgo) return "year";
  return "older";
}

function getSectionLabel(section: TimeSection): string {
  switch (section) {
    case "today": return "Today";
    case "yesterday": return "Yesterday";
    case "week": return "Past Week";
    case "month": return "Past Month";
    case "year": return "Past Year";
    case "older": return "Older";
  }
}

function matchesTimeFilter(scrapedAt: Date | string | undefined, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const section = getTimeSection(scrapedAt);
  
  switch (filter) {
    case "today": return section === "today";
    case "yesterday": return section === "yesterday";
    case "week": return section === "today" || section === "yesterday" || section === "week";
    case "month": return section === "today" || section === "yesterday" || section === "week" || section === "month";
    case "year": return section !== "older";
    default: return true;
  }
}

export default function MyJobs() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { toast } = useToast();

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      const newCount = data?.newCount ?? 0;
      toast({
        title: "Search Complete",
        description: newCount > 0 
          ? `Found ${newCount} new job${newCount === 1 ? '' : 's'} matching your skills!`
          : "No new jobs found matching your current skills. Try updating your profile.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: parseApiError(error, "Failed to search for jobs. Please try again."),
      });
    },
  });

  const refreshStatusQuery = useQuery<{ status: ScrapeStatus }>({
    queryKey: ["/api/jobs/refresh-status"],
    enabled: refreshJobsMutation.isPending,
    refetchInterval: refreshJobsMutation.isPending ? 1000 : false,
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const jobs = jobsQuery.data?.jobs ?? [];
  const status = refreshStatusQuery.data?.status;

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (sourceFilter !== "all" && job.source !== sourceFilter) return false;
      if (statusFilter === "saved" && !job.saved) return false;
      if (statusFilter === "applied" && !job.applied) return false;
      if (!matchesTimeFilter(job.scrapedAt, timeFilter)) return false;
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
  }, [jobs, sourceFilter, statusFilter, timeFilter, searchQuery]);

  // Group jobs by time section
  const groupedJobs = useMemo(() => {
    const groups: Record<TimeSection, JobPost[]> = {
      today: [],
      yesterday: [],
      week: [],
      month: [],
      year: [],
      older: [],
    };
    
    filteredJobs.forEach((job) => {
      const section = getTimeSection(job.scrapedAt);
      groups[section].push(job);
    });
    
    return groups;
  }, [filteredJobs]);

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

  // Determine which sections to show - only sections with jobs
  const sectionsToShow: TimeSection[] = useMemo(() => {
    return (["today", "yesterday", "week", "month", "year", "older"] as TimeSection[]).filter(
      (section) => groupedJobs[section].length > 0
    );
  }, [groupedJobs]);

  const renderJobSection = (section: TimeSection, jobs: JobPost[]) => {
    if (jobs.length === 0) return null;
    
    return (
      <div key={section} className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">{getSectionLabel(section)}</h3>
          <Badge variant="outline" className="rounded-md">
            {jobs.length}
          </Badge>
        </div>
        <div
          className={
            viewMode === "grid"
              ? "grid sm:grid-cols-2 gap-6"
              : "space-y-6"
          }
        >
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSave={handleSaveJob}
              onApply={handleApplyJob}
              onGenerateMessage={handleGenerateMessage}
            />
          ))}
        </div>
      </div>
    );
  };

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
            Search Jobs
          </Button>
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
              timeFilter={timeFilter}
              onTimeChange={setTimeFilter}
              jobCount={filteredJobs.length}
            />
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState type="no-results" />
          ) : (
            <div className="space-y-10" data-testid="job-list">
              {sectionsToShow.map((section) =>
                renderJobSection(section, groupedJobs[section])
              )}
            </div>
          )}
        </div>
      )}
      <ScrapeLoadingScreen
        isOpen={refreshJobsMutation.isPending}
        statusStep={status?.step}
        statusLabel={status?.label}
      />
    </div>
  );
}
