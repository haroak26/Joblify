import { Button } from "@/components/ui/button";
import { Search, Sparkles, Briefcase, Plus } from "lucide-react";

interface EmptyStateProps {
  type: "no-skills" | "no-jobs" | "no-results";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === "no-skills") {
    return (
      <div className="py-16 px-4 text-center" data-testid="empty-no-skills">
        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Add Your Skills</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Start by adding your skills so we can find freelance opportunities that match your expertise.
        </p>
        {onAction && (
          <Button onClick={onAction} data-testid="button-add-first-skill">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Skill
          </Button>
        )}
      </div>
    );
  }

  if (type === "no-jobs") {
    return (
      <div className="py-16 px-4 text-center" data-testid="empty-no-jobs">
        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Jobs Yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          We're searching social platforms for opportunities that match your skills. 
          Check back soon or try adding more skills.
        </p>
        {onAction && (
          <Button onClick={onAction} variant="outline" data-testid="button-refresh-jobs">
            <Search className="w-4 h-4 mr-2" />
            Refresh Jobs
          </Button>
        )}
      </div>
    );
  }

  if (type === "no-results") {
    return (
      <div className="py-16 px-4 text-center" data-testid="empty-no-results">
        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Matching Jobs</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          No jobs match your current filters. Try adjusting your search or clearing filters.
        </p>
      </div>
    );
  }

  return null;
}
