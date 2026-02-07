import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Sparkles, ArrowRight } from "lucide-react";

interface ResumeCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResumeCreationModal({ open, onOpenChange }: ResumeCreationModalProps) {
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
      onOpenChange(false);
      
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Your Resume</DialogTitle>
          <DialogDescription className="text-base">
            Choose how you'd like to start building your professional resume
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Traditional Builder Option */}
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Traditional Builder</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Build step-by-step with our guided resume editor. Perfect for those who prefer full control.
                  </p>
                  <Button 
                    onClick={handleTraditionalBuilder}
                    disabled={createResumeMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI-Powered Option */}
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:from-purple-600 group-hover:to-pink-600 transition-colors">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    AI-Powered Creation
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                      New
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chat with our AI assistant to build your resume naturally through conversation.
                  </p>
                  <Button 
                    onClick={handleAIBuilder}
                    disabled={createResumeMutation.isPending}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Start Chat
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
