import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function CreateResume() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createResumeMutation = useMutation({
    mutationFn: async (mode: "traditional" | "ai") => {
      const response = await apiRequest("POST", "/api/resumes", {
        title: "Untitled Resume",
      });
      return { resume: await response.json(), mode };
    },
    onSuccess: ({ resume, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      
      if (mode === "ai") {
        setLocation(`/dashboard/resume-builder/${resume.id}?mode=ai`);
      } else {
        setLocation(`/dashboard/resume-builder/${resume.id}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTraditionalBuilder = () => {
    createResumeMutation.mutate("traditional");
  };

  const handleAIBuilder = () => {
    createResumeMutation.mutate("ai");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard/resumes")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resumes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Create Your Resume</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Choose how you'd like to start building your professional resume
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional Builder Option */}
            <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3">Traditional</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    Build step-by-step with our guided resume editor. Perfect for those who prefer full control over their resume content.
                  </p>
                  <Button 
                    onClick={handleTraditionalBuilder}
                    disabled={createResumeMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI-Powered Option */}
            <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center mb-4 group-hover:opacity-90 transition-opacity">
                    <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <h2 className="text-xl sm:text-2xl font-bold">AI Chat</h2>
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    Chat with our AI assistant to build your resume naturally through conversation. Fast, easy, and intelligent.
                  </p>
                  <Button 
                    onClick={handleAIBuilder}
                    disabled={createResumeMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    Start Chat
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
