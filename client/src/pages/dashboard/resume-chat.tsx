import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";

export default function ResumeChat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

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

  if (!id) {
    return <div>Creating resume...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Build Your Resume</h1>
      
      <Card className="p-6 space-y-4 min-h-[500px]">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {chatHistory?.messages?.map((msg: any, i: number) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-12"
                  : "bg-muted mr-12"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {sendMessage.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is thinking...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell me about your experience..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (message.trim() && !sendMessage.isPending) {
                  sendMessage.mutate(message);
                }
              }
            }}
          />
          <Button
            onClick={() => sendMessage.mutate(message)}
            disabled={!message.trim() || sendMessage.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
