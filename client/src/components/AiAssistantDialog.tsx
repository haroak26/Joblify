import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken } from "@/lib/queryClient";

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: string;
  currentContent: string;
  onContentImproved: (improvedContent: string) => void;
}

export function AiAssistantDialog({
  open,
  onOpenChange,
  section,
  currentContent,
  onContentImproved,
}: AiAssistantDialogProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const { toast } = useToast();

  const improveMutation = useMutation({
    mutationFn: async (prompt?: string) => {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const res = await fetch("/api/ai/improve-content", {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: currentContent,
          section: section,
          customPrompt: prompt,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to improve content");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.improvedContent) {
        onContentImproved(data.improvedContent);
        toast({
          title: "Content Improved!",
          description: "Your content has been enhanced by AI.",
        });
        onOpenChange(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "AI Improvement Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const quickActions = [
    {
      label: "Make More Professional",
      prompt: "Make this sound more professional and polished",
    },
    {
      label: "Add Metrics & Numbers",
      prompt: "Add quantifiable metrics and numbers to demonstrate impact",
    },
    {
      label: "Use Action Verbs",
      prompt: "Rewrite using strong action verbs at the start of each point",
    },
    {
      label: "Optimize for ATS",
      prompt: "Optimize this for ATS (Applicant Tracking Systems) with relevant keywords",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>AI Resume Assistant</DialogTitle>
              <DialogDescription>
                Improve your {section} with AI-powered suggestions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Content Preview */}
          <div>
            <label className="text-sm font-medium mb-1 block">Current Content:</label>
            <div className="bg-muted p-3 rounded-lg text-sm max-h-32 overflow-y-auto">
              {currentContent || "No content yet"}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Improvements:</label>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => improveMutation.mutate(action.prompt)}
                  disabled={improveMutation.isPending || !currentContent}
                  className="justify-start text-left h-auto py-2"
                >
                  <Sparkles className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Or describe what you want to improve:
            </label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., Make it more concise, Focus on leadership skills, Add technical details..."
              rows={3}
              disabled={improveMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={improveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => improveMutation.mutate(customPrompt)}
              disabled={improveMutation.isPending || !currentContent || !customPrompt.trim()}
            >
              {improveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Improve with AI
                </>
              )}
            </Button>
          </div>

          {/* Usage Note */}
          <p className="text-xs text-muted-foreground">
            Available for Plus and Ultra plan subscribers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
