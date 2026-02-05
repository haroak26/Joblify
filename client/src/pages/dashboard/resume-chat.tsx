import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Sparkles, MessageSquare, Target, Clock, CheckCircle2 } from "lucide-react";

const PRESENTATION_CARDS = [
  {
    icon: MessageSquare,
    title: "Natural Conversation",
    description: "Talk about your experience as if you're chatting with a career coach. No rigid forms to fill out!"
  },
  {
    icon: Sparkles,
    title: "AI-Powered Intelligence",
    description: "Our AI adapts to your background, asking personalized follow-up questions based on your responses."
  },
  {
    icon: Target,
    title: "ATS-Optimized Results",
    description: "Every resume is automatically optimized for Applicant Tracking Systems to get past the robots."
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Create a professional resume in minutes, not hours. Just chat naturally and watch your resume build."
  }
];

export default function ResumeChat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [showPresentation, setShowPresentation] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Resume", template: "modern" }),
      });
      if (!res.ok) throw new Error("Failed to create resume");
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/dashboard/resumes/${data.resume.id}/chat`);
    },
  });

  const { data: chatHistory } = useQuery<any>({
    queryKey: [`/api/chat/resume/${id}/history`],
    enabled: !!id,
  });

  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch(`/api/chat/resume/${id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/resume/${id}/history`] });
      setMessage("");
    },
  });

  useEffect(() => {
    if (!id && !createMutation.isPending && !createMutation.isSuccess) {
      createMutation.mutate();
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory?.messages, sendMessage.isPending]);

  // Check if this is first time user is using the feature
  useEffect(() => {
    if (id && chatHistory) {
      const hasSeenPresentation = localStorage.getItem(`resume-chat-presentation-${id}`);
      const messages = chatHistory?.messages || [];
      
      // Show presentation only if: no messages AND hasn't seen it before
      if (messages.length === 0 && !hasSeenPresentation) {
        setShowPresentation(true);
      }
    }
  }, [id, chatHistory]);

  const handleDismissPresentation = () => {
    if (id) {
      localStorage.setItem(`resume-chat-presentation-${id}`, 'seen');
    }
    setShowPresentation(false);
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Creating your resume...</p>
        </div>
      </div>
    );
  }

  // Show presentation cards
  if (showPresentation) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to AI Resume Builder</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Here's how our conversational AI will help you create the perfect resume
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {PRESENTATION_CARDS.map((card, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <card.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={handleDismissPresentation}>
            Get Started
            <Sparkles className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  const messages = chatHistory?.messages || [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="flex flex-col h-[600px]">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted p-4 rounded-lg rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">AI is typing...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here... (e.g., 'I worked at Google as a Software Engineer')"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim() && !sendMessage.isPending) {
                    sendMessage.mutate(message);
                  }
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage.mutate(message)}
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Just answer naturally in your own words
          </p>
        </div>
      </Card>
    </div>
  );
}
