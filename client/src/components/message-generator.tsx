import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Wand2 } from "lucide-react";
import type { JobPost } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessageGeneratorProps {
  job: JobPost | null;
  skills: string[];
  intro: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent: (jobId: string) => void;
}

type Tone = "professional" | "friendly" | "enthusiastic";

export function MessageGenerator({ 
  job, 
  skills, 
  intro,
  open, 
  onOpenChange,
  onMessageSent 
}: MessageGeneratorProps) {
  const [tone, setTone] = useState<Tone>("professional");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      jobTitle: string; 
      jobDescription: string; 
      skills: string[]; 
      tone: Tone;
      intro: string;
    }) => {
      const response = await apiRequest("POST", "/api/generate-message", data);
      return response.json();
    },
    onSuccess: (data) => {
      setMessage(data.message);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!job) return;
    generateMutation.mutate({
      jobTitle: job.title,
      jobDescription: job.description,
      skills: skills.filter(s => job.matchedSkills.includes(s)),
      tone,
      intro,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkAsSent = () => {
    if (job) {
      onMessageSent(job.id);
      onOpenChange(false);
      setMessage("");
      toast({
        title: "Success",
        description: "Job marked as applied!",
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setMessage("");
    }
    onOpenChange(open);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            Generate Follow-up Message
          </DialogTitle>
          <DialogDescription>
            Create a personalized message for this opportunity using AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-1">{job.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {job.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {job.matchedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-md text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tone:</span>
              <Select value={tone} onValueChange={(v: Tone) => setTone(v)}>
                <SelectTrigger className="w-40" data-testid="select-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="gap-2"
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {message ? "Regenerate" : "Generate"}
            </Button>
          </div>

          {message && (
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                className="resize-none text-base leading-relaxed"
                data-testid="textarea-message"
              />
              <p className="text-xs text-muted-foreground">
                Feel free to edit the message before copying.
              </p>
            </div>
          )}

          {!message && !generateMutation.isPending && (
            <div className="py-10 text-center border border-dashed rounded-lg">
              <Wand2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Click Generate to create a personalized message</p>
            </div>
          )}

          {generateMutation.isPending && (
            <div className="py-10 text-center border border-dashed rounded-lg">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your personalized message...</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {message && (
            <>
              <Button
                variant="secondary"
                onClick={handleCopy}
                className="gap-2"
                data-testid="button-copy-message"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy Message"}
              </Button>
              <Button
                onClick={handleMarkAsSent}
                data-testid="button-mark-sent"
              >
                Mark as Applied
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
