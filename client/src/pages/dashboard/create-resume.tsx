import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Sparkles, ArrowRight, Briefcase, Lock } from "lucide-react";
import { UpgradeDialog } from "@/components/UpgradeDialog";

interface ResumeLimits {
  canCreate: boolean;
  limit: number;
  current: number;
  plan: string;
  aiAccessBlocked: boolean;
}

export default function CreateResume() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fetch resume limits
  const { data: limits, isLoading: limitsLoading } = useQuery<ResumeLimits>({
    queryKey: ["/api/resumes/limits"],
  });

  const createResumeMutation = useMutation({
    mutationFn: async (mode: "traditional" | "ai") => {
      const response = await apiRequest("POST", "/api/resumes", {
        title: "Untitled Resume",
      });
      return { resume: await response.json(), mode };
    },
    onSuccess: ({ resume, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resumes/limits"] });
      
      if (mode === "ai") {
        setLocation(`/dashboard/resume-builder/${resume.id}?mode=ai`);
      } else {
        setLocation(`/dashboard/resume-builder/${resume.id}`);
      }
    },
    onError: (error: any) => {
      // Check if this is a limit error
      if (error?.code === "RESUME_LIMIT" || error?.message?.includes("limit")) {
        setShowUpgradeDialog(true);
      } else {
        const errorMessage = error?.message || "Failed to create resume. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleTraditionalBuilder = () => {
    // Check limit before creating
    if (isAtLimit) {
      setShowUpgradeDialog(true);
      return;
    }
    createResumeMutation.mutate("traditional");
  };

  const handleAIBuilder = () => {
    if (limits?.aiAccessBlocked) {
      toast({
        title: "AI Access Blocked",
        description: "Your AI access has been restricted. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    // Check limit before creating
    if (isAtLimit) {
      setShowUpgradeDialog(true);
      return;
    }
    createResumeMutation.mutate("ai");
  };

  // Check if AI should be hidden (limit reached or AI blocked)
  const shouldHideAI = limits && (!limits.canCreate || limits.aiAccessBlocked);
  const isAtLimit = limits && !limits.canCreate;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base">Joblify</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Create Your Resume</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {shouldHideAI 
                ? "Build your resume with our traditional editor"
                : "Choose how you'd like to start building your professional resume"}
            </p>
            {isAtLimit && (
              <p className="text-sm text-destructive mt-2">
                You've reached your resume limit ({limits.current}/{limits.limit}).
                {limits.plan === "free" ? " Upgrade to create more resumes." : " Delete a resume to create a new one or upgrade your plan."}
              </p>
            )}
          </div>

          <div className={shouldHideAI ? 'grid md:grid-cols-1 max-w-md mx-auto gap-6' : 'grid md:grid-cols-2 gap-6'}>
            {/* Traditional Builder Option */}
            <Card className="border hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">Traditional</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Build step-by-step with our guided resume editor. Perfect for those who prefer full control over their resume content.
                  </p>
                  <Button 
                    onClick={handleTraditionalBuilder}
                    disabled={createResumeMutation.isPending || limitsLoading}
                    size="sm"
                    className="w-full h-9"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI-Powered Option - Only show if not at limit and AI not blocked */}
            {!shouldHideAI && (
              <Card className="border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary flex items-center justify-center mb-4 group-hover:opacity-90 transition-opacity">
                      <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className="text-lg sm:text-xl font-semibold">AI Chat</h2>
                      <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Chat with our AI assistant to build your resume naturally through conversation. Fast, easy, and intelligent.
                    </p>
                    <Button 
                      onClick={handleAIBuilder}
                      disabled={createResumeMutation.isPending || limitsLoading}
                      size="sm"
                      className="w-full h-9"
                    >
                      Start Chat
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="resumes"
        currentPlan={limits?.plan || "free"}
        limit={limits?.limit}
        current={limits?.current}
      />
    </div>
  );
}
