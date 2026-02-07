import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User as UserIcon, Sparkles, Edit } from "lucide-react";
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    const greeting: ChatMessage = {
      role: "assistant",
      content: "Hi! I'm your AI resume assistant. I'll help you build a professional resume through a friendly conversation. Let's start with the basics - what's your full name?",
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);
  }, []);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Resume Assistant</h2>
            <p className="text-sm text-muted-foreground">
              {isComplete ? "Resume complete!" : "Building your resume..."}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToManual}
        >
          <Edit className="w-4 h-4 mr-2" />
          Switch to Manual Editor
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <Card
                className={`max-w-[70%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isComplete ? "Chat complete! Switch to manual editor to continue." : "Type your message..."}
            disabled={isLoading || isComplete}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isComplete}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {isComplete && (
          <div className="max-w-3xl mx-auto mt-3">
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
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
