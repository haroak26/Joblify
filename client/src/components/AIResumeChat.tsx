import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, User as UserIcon, Edit3, Settings2 } from "lucide-react";
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
  selectedComponents?: string[];
  onEditComponents?: () => void;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  id: string; // Add unique ID for proper key usage
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
  selectedComponents = [],
  onEditComponents,
}: AIResumeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [activeComponents, setActiveComponents] = useState<string[]>(selectedComponents);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting and user data prefill
  useEffect(() => {
    if (messages.length === 0 && resumeData && user) {
      // Extract first name from user.name, fallback to username
      const firstName = user.name?.split(" ")[0] || user.username || "there";
      
      // Pre-fill user data if not already filled
      const shouldPrefill = !resumeData.personalInfo?.name && !resumeData.personalInfo?.email;
      if (shouldPrefill && user.name && user.email) {
        onUpdate({
          personalInfo: {
            ...resumeData.personalInfo,
            name: user.name,
            email: user.email,
          },
        });
      }
      
      const greeting = focusedComponent
        ? `Welcome ${firstName}! I'm here to help you improve your ${focusedComponent}. What would you like to work on?`
        : activeComponents.length > 0
        ? `Welcome ${firstName}! I see you want to work on: ${activeComponents.join(', ')}. Let's start building your resume! First, let's confirm your professional summary. How would you describe your professional background in 2-3 sentences?`
        : `Welcome ${firstName}! I'm your AI resume assistant. I'll help you build your resume step by step. Let's start with your professional summary. How would you describe your professional background in 2-3 sentences?`;
      
      setMessages([{ role: "ai", content: greeting, id: Date.now().toString() }]);
    }
  }, [messages.length, resumeData, user, focusedComponent, activeComponents, onUpdate]);

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
          selectedComponents: activeComponents,
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
      // Add AI response to messages with unique ID
      setMessages((prev) => [...prev, { role: "ai", content: data.reply, id: `ai-${Date.now()}` }]);

      // Update resume data if AI extracted new information
      if (data.updatedData && Object.keys(data.updatedData).length > 0) {
        onUpdate(data.updatedData);
      }

      // Handle dynamically added components
      if (data.addedComponents && data.addedComponents.length > 0) {
        setActiveComponents((prev) => {
          const newComponents = data.addedComponents!.filter(c => !prev.includes(c));
          if (newComponents.length > 0) {
            toast({
              title: "Components Added",
              description: `Added: ${newComponents.join(', ')}`,
            });
            return [...prev, ...newComponents];
          }
          return prev;
        });
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

    // Add user message to chat with unique ID
    const userMessage: ChatMessage = { 
      role: "user", 
      content: inputMessage.trim(),
      id: `user-${Date.now()}`
    };
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
      <div className="flex flex-col p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
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
        
        {/* Active Components Badges */}
        {activeComponents.length > 0 && !focusedComponent && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">Active sections:</span>
            {activeComponents.map((component) => (
              <Badge key={component} variant="secondary" className="text-xs">
                {component}
              </Badge>
            ))}
            {onEditComponents && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditComponents}
                className="h-6 text-xs"
              >
                <Settings2 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
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
        <div className="max-w-3xl mx-auto relative flex items-center">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isComplete ? "Resume complete!" : "Type your message..."}
            disabled={chatMutation.isPending || isComplete}
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 pr-12 h-11"
          />
          <div className="absolute right-1.5 flex items-center">
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || chatMutation.isPending || isComplete}
              size="icon"
              className="h-8 w-8"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {inputMessage.length}/{MAX_MESSAGE_LENGTH} characters
        </p>
      </div>
    </div>
  );
}
