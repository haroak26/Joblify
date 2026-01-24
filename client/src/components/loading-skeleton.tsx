import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function JobCardSkeleton() {
  return (
    <Card data-testid="job-card-skeleton">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
            <Skeleton className="w-full h-5" />
            <Skeleton className="w-3/4 h-5" />
          </div>
          <Skeleton className="w-9 h-9 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2 mb-4">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
        <div className="flex flex-wrap gap-4 mb-3">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="w-16 h-5 rounded-md" />
          <Skeleton className="w-20 h-5 rounded-md" />
          <Skeleton className="w-14 h-5 rounded-md" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t gap-2">
        <Skeleton className="w-32 h-8 rounded-md" />
        <Skeleton className="w-24 h-8 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export function JobListSkeleton() {
  return (
    <div className="space-y-4" data-testid="job-list-skeleton">
      <JobCardSkeleton />
      <JobCardSkeleton />
      <JobCardSkeleton />
    </div>
  );
}

export function SkillsSkeleton() {
  return (
    <Card data-testid="skills-skeleton">
      <CardHeader>
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-64 h-4 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-9 rounded-md" />
          <Skeleton className="w-9 h-9 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="w-20 h-6 rounded-md" />
          <Skeleton className="w-24 h-6 rounded-md" />
          <Skeleton className="w-16 h-6 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
