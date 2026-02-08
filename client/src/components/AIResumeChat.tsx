import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, Bot, User as UserIcon, Sparkles, Edit } from "lucide-react";
import type { ResumeData } from "@shared/schema";

interface AIResumeChatProps {
  resumeId: string;
  resumeData: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
  onSwitchToManual: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIResumeChat({ 
  resumeId, 
  resumeData, 
  onUpdate,
  onSwitchToManual 
}: AIResumeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with personalized greeting
  useEffect(() => {
    // Extract first name from user
    let firstName = "there";
    if (user) {
      if (user.name) {
        // Extract first name from full name
        firstName = user.name.split(' ')[0];
      } else if (user.email) {
        // Use email username as fallback
        firstName = user.email.split('@')[0];
      }
    }

    const greeting: ChatMessage = {
      role: "assistant",
      content: `Hi ${firstName}! I'm your AI resume assistant. I'll help you build a professional resume through a friendly conversation. Let's start with the basics - what's your full name?`,
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", `/api/resumes/${resumeId}/ai-chat`, {
        message: inputValue,
        currentData: resumeData,
        conversationHistory: messages,
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update resume data if AI extracted new information
      if (data.updatedData) {
        onUpdate(data.updatedData);
      }

      // Check if conversation is complete
      if (data.isComplete) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-3 sm:p-4 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">AI Resume Assistant</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isComplete ? "Resume complete!" : "Building your resume..."}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToManual}
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Switch to Manual Editor
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollAreaRef}>
        <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              <Card
                className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <CardContent className="p-2.5 sm:p-3">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </CardContent>
              </Card>
              {message.role === "user" && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <Card className="bg-muted">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-3 sm:p-4 bg-card">
        <div className="max-w-3xl mx-auto relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isComplete ? "Chat complete! Switch to manual editor to continue." : "Type your message..."}
            disabled={isLoading || isComplete}
            className="flex-1 text-sm pr-12"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isComplete}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex-shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
        {isComplete && (
          <div className="max-w-3xl mx-auto mt-3">
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                  ✨ Great job! Your resume is ready. You can now switch to the manual editor to make any final adjustments.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
