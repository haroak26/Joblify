import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Sparkles } from "lucide-react";

export default function ResumeChat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
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
      setLocation(`/dashboard/resumes/${data.id}/chat`);
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

  const messages = chatHistory?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Build Your Resume with AI
        </h1>
        <p className="text-muted-foreground mt-2">
          Chat naturally with our AI to create your resume - no forms required!
        </p>
      </div>
      
      <Card className="flex flex-col h-[600px]">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {!hasMessages && (
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <p className="text-sm text-muted-foreground">
                👋 Welcome! I'm your AI resume assistant. Just chat with me naturally, and I'll help build your resume.
                I'll ask you questions like "What's your name?" or "Tell me about your work experience" - just answer in your own words!
              </p>
            </div>
          )}
          
          {messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
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
              <div className="bg-muted p-4 rounded-lg flex items-center gap-2">
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
              placeholder="Type your message here... (e.g., 'My name is John Smith')"
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
            Press Enter to send • Just answer naturally, no need to format your responses
          </p>
        </div>
      </Card>
    </div>
  );
}
