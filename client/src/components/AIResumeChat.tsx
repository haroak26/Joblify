import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, User as UserIcon, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ResumeData } from "@shared/schema";

interface AIResumeChatProps {
  resumeId: string;
  resumeData: ResumeData | null;
  onUpdate: (data: Partial<ResumeData>) => void;
  onSwitchToManual: () => void;
  onComplete?: () => void;
  focusedComponent?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES = 10;

export default function AIResumeChat({
  resumeId,
  resumeData,
  onUpdate,
  onSwitchToManual,
  onComplete,
  focusedComponent,
}: AIResumeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && resumeData) {
      const firstName = resumeData.personalInfo?.name?.split(" ")[0] || user?.username || "there";
      const greeting = focusedComponent
        ? `Hi ${firstName}! I'm here to help you improve your ${focusedComponent}. What would you like to work on?`
        : `Hi ${firstName}! I'm your AI resume assistant. I'll help you build your resume step by step. Let's start with your personal information. What's your full name?`;
      
      setMessages([{ role: "ai", content: greeting }]);
    }
  }, [messages.length, resumeData, user?.username, focusedComponent]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      // Sanitize input
      const sanitizedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);
      
      const response = await fetch(`/api/resumes/${resumeId}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sanitizedMessage,
          focusedComponent,
          conversationHistory: messages.slice(-MAX_MESSAGES).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (data: { reply: string; updatedData?: Partial<ResumeData>; isComplete?: boolean; addedComponents?: string[] }) => {
      // Add AI response to messages
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);

      // Update resume data if AI extracted new information
      if (data.updatedData && Object.keys(data.updatedData).length > 0) {
        onUpdate(data.updatedData);
      }

      // Check if resume is complete
      if (data.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          toast({
            title: "Resume Complete!",
            description: "Your resume is ready. Redirecting to compilation...",
          });
          if (onComplete) {
            onComplete();
          }
        }, 2000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Message Failed",
        description: error.message,
        variant: "destructive",
      });
      // Remove the user message if the request failed
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    // Add user message to chat
    const userMessage: ChatMessage = { role: "user", content: inputMessage.trim() };
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to backend
    chatMutation.mutate(inputMessage.trim());
    
    // Clear input
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI Resume Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {focusedComponent ? `Editing ${focusedComponent}` : "Building your resume"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSwitchToManual}
          className="flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          <span className="hidden sm:inline">Switch to Manual Editor</span>
          <span className="sm:hidden">Manual</span>
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "ai"
                    ? "bg-gradient-to-br from-purple-500 to-pink-500"
                    : "bg-primary"
                }`}
              >
                {message.role === "ai" ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-12"
                    : "bg-muted mr-12"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                🎉 Great job! Your resume is complete and ready for download.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/30">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isComplete ? "Resume complete!" : "Type your message..."}
            disabled={chatMutation.isPending || isComplete}
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || chatMutation.isPending || isComplete}
            size="icon"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {inputMessage.length}/{MAX_MESSAGE_LENGTH} characters
        </p>
      </div>
    </div>
  );
}
