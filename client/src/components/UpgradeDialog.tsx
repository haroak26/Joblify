import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { LIMIT_METRIC_LABELS, PLAN_LIMITS, formatLimitValue, resolveLimitMetricKey } from "@shared/plan-limits";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  currentPlan: string;
  limit?: number;
  current?: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  featureName,
  currentPlan,
  limit,
  current,
}: UpgradeDialogProps) {
  const [, setLocation] = useLocation();
  
  // Determine which plan to recommend based on current plan
  const isFreePlan = currentPlan === "free";
  const recommendedPlan = isFreePlan ? "Plus" : "Ultra";

  const normalizedMetricKey = resolveLimitMetricKey(featureName);
  const displayFeatureName = LIMIT_METRIC_LABELS[normalizedMetricKey] ?? featureName;

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation("/dashboard/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Limit Reached
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-base text-left pt-2">
            {limit && current !== undefined ? (
              <span>
                You've reached your <strong>{displayFeatureName}</strong> limit ({current}/{limit}).
              </span>
            ) : (
              <span>
                You've maxed out your usage for <strong>{displayFeatureName}</strong>.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {isFreePlan ? (
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              ) : (
                <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-semibold mb-1">
                  Upgrade to {recommendedPlan}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isFreePlan ? (
                    <>Get up to {PLAN_LIMITS.plus.maxResumes} resumes and {PLAN_LIMITS.plus.maxCoverLettersPerMonth} cover letters per month with {recommendedPlan}.</>
                  ) : (
                    <>Unlock {formatLimitValue(PLAN_LIMITS.ultra.maxResumes).toLowerCase()} resumes, {formatLimitValue(PLAN_LIMITS.ultra.maxCoverLettersPerMonth).toLowerCase()} cover letters, and all AI features with {recommendedPlan}.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleUpgrade} 
              className="w-full"
              size="lg"
            >
              {isFreePlan ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Plus
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Ultra
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
