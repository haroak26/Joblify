import { Loader2, Search, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface SearchLoadingOverlayProps {
  isSearching: boolean;
  onComplete?: () => void;
}

const searchSteps = [
  { text: "Preparing search queries...", duration: 2000 },
  { text: "Searching X for opportunities...", duration: 6000 },
  { text: "Filtering results with AI...", duration: 3000 },
  { text: "Matching jobs to your skills...", duration: 2000 },
];

export function SearchLoadingOverlay({ isSearching, onComplete }: SearchLoadingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isSearching) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Simulate progress through steps
    let totalTime = 0;
    const stepTimers: NodeJS.Timeout[] = [];
    
    searchSteps.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
        setProgress(((index + 1) / searchSteps.length) * 100);
      }, totalTime);
      stepTimers.push(timer);
      totalTime += step.duration;
    });

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + 0.5;
      });
    }, 100);

    return () => {
      stepTimers.forEach(timer => clearTimeout(timer));
      clearInterval(progressInterval);
    };
  }, [isSearching]);

  if (!isSearching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Animated Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background flex items-center justify-center border-2 border-primary">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Searching for Jobs</h3>
              <p className="text-sm text-muted-foreground">
                Finding opportunities that match your skills
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {Math.round(progress)}%
              </p>
            </div>

            {/* Steps */}
            <div className="w-full space-y-3 text-left">
              {searchSteps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    index < currentStep
                      ? "text-green-600 dark:text-green-400"
                      : index === currentStep
                      ? "text-primary font-medium"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : index === currentStep ? (
                    <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-current flex-shrink-0" />
                  )}
                  <span>{step.text}</span>
                </div>
              ))}
            </div>

            {/* Info Message */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 You can switch tabs - the search continues on the server and results will appear when you return.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
