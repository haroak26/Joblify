import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function JobCardSkeleton() {
  return (
    <Card data-testid="job-card-skeleton">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-16 h-6 rounded-md" />
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-16 h-4 rounded" />
            </div>
            <Skeleton className="w-full h-6 rounded" />
            <Skeleton className="w-3/4 h-6 rounded" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2 mb-4">
          <Skeleton className="w-full h-4 rounded" />
          <Skeleton className="w-full h-4 rounded" />
          <Skeleton className="w-2/3 h-4 rounded" />
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <Skeleton className="w-24 h-4 rounded" />
          <Skeleton className="w-16 h-4 rounded" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="w-20 h-6 rounded-md" />
          <Skeleton className="w-24 h-6 rounded-md" />
          <Skeleton className="w-16 h-6 rounded-md" />
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t gap-3">
        <Skeleton className="w-36 h-10 rounded-lg" />
        <Skeleton className="w-28 h-10 rounded-lg" />
      </CardFooter>
    </Card>
  );
}

export function JobListSkeleton() {
  return (
    <div className="space-y-5" data-testid="job-list-skeleton">
      <JobCardSkeleton />
      <JobCardSkeleton />
      <JobCardSkeleton />
    </div>
  );
}

export function SkillsSkeleton() {
  return (
    <div className="space-y-6">
      <Card data-testid="intro-skeleton">
        <CardHeader>
          <Skeleton className="w-40 h-6 rounded" />
          <Skeleton className="w-80 h-4 mt-2 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="w-full h-32 rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-40 h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <Card data-testid="skills-skeleton">
        <CardHeader>
          <Skeleton className="w-32 h-6 rounded" />
          <Skeleton className="w-64 h-4 mt-2 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-11 rounded-lg" />
            <Skeleton className="w-11 h-11 rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="w-24 h-8 rounded-md" />
            <Skeleton className="w-28 h-8 rounded-md" />
            <Skeleton className="w-20 h-8 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResumeCardSkeleton() {
  return (
    <Card className="p-6" data-testid="resume-card-skeleton">
      <Skeleton className="w-48 h-6 rounded mb-2" />
      <Skeleton className="w-32 h-4 rounded mb-4" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-9 rounded" />
        <Skeleton className="w-16 h-9 rounded" />
        <Skeleton className="w-10 h-9 rounded" />
      </div>
    </Card>
  );
}

export function ResumeListSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="resume-list-skeleton">
      <ResumeCardSkeleton />
      <ResumeCardSkeleton />
      <ResumeCardSkeleton />
    </div>
  );
}

export function ResumeEditorSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex justify-end">
        <Skeleton className="w-40 h-10 rounded" />
      </div>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="w-32 h-5 rounded" />
            <Skeleton className="w-full h-10 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-40 h-5 rounded" />
            <Skeleton className="w-full h-32 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-48 h-5 rounded" />
            <Skeleton className="w-full h-10 rounded" />
          </div>
        </div>
      </Card>
    </div>
  );
}
