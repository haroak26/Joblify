import { Button } from "@/components/ui/button";
import { Search, Sparkles, Briefcase, User } from "lucide-react";

interface EmptyStateProps {
  type: "no-skills" | "no-jobs" | "no-results";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === "no-skills") {
    return (
      <div className="py-20 px-4 text-center border border-dashed rounded-lg" data-testid="empty-no-skills">
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-bold text-xl mb-2">Complete Your Profile</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          Add your introduction and skills so we can find job opportunities that match your expertise.
        </p>
        <Button className="gap-2" data-testid="button-go-to-profile">
          <Sparkles className="w-4 h-4" />
          Set Up Profile
        </Button>
      </div>
    );
  }

  if (type === "no-jobs") {
    return (
      <div className="py-20 px-4 text-center border border-dashed rounded-lg" data-testid="empty-no-jobs">
        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-5">
          <Briefcase className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-xl mb-2">No Jobs Yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          We're searching social platforms for opportunities that match your skills. 
          Click search or try adding more skills.
        </p>
        {onAction && (
          <Button onClick={onAction} variant="secondary" className="gap-2" data-testid="button-refresh-jobs">
            <Search className="w-4 h-4" />
            Search Jobs
          </Button>
        )}
      </div>
    );
  }

  if (type === "no-results") {
    return (
      <div className="py-20 px-4 text-center border border-dashed rounded-lg" data-testid="empty-no-results">
        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-5">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-xl mb-2">No Matching Jobs</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          No jobs match your current filters. Try adjusting your search or clearing filters.
        </p>
      </div>
    );
  }

  return null;
}
