import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type ScrapeStep = "idle" | "defining" | "x" | "reddit" | "facebook" | "complete" | "error";

const steps: Array<{ step: Exclude<ScrapeStep, "idle" | "complete" | "error">; label: string }> = [
  { step: "defining", label: "Defining Requirements" },
  { step: "x", label: "Searching X" },
  { step: "reddit", label: "Searching Reddit" },
  { step: "facebook", label: "Searching Facebook" },
];

interface ScrapeLoadingScreenProps {
  isOpen: boolean;
  statusStep?: ScrapeStep;
  statusLabel?: string;
}

export function ScrapeLoadingScreen({ isOpen, statusStep = "defining", statusLabel }: ScrapeLoadingScreenProps) {
  if (!isOpen) return null;

  const activeIndex = steps.findIndex((step) => step.step === statusStep);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="px-6 pt-6 pb-4 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Searching Jobs</p>
          <h3 className="mt-2 text-xl font-semibold">
            {statusLabel || steps[currentIndex]?.label || "Searching opportunities"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please keep this tab open while we search across social platforms.
          </p>
        </div>
        <div className="px-6 pb-6 space-y-4">
          {steps.map((step, index) => {
            const isComplete = statusStep === "complete" || index < currentIndex;
            const isActive = index === currentIndex && statusStep !== "complete";
            const Icon = isActive ? Loader2 : isComplete ? CheckCircle2 : Circle;
            return (
              <div key={step.step} className="flex items-center gap-3">
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "animate-spin text-primary"
                      : isComplete
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                  }`}
                />
                <span className={isActive ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
