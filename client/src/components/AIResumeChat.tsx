import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, Bot, User as UserIcon, Sparkles, Edit } from "lucide-react";
import type { ResumeData } from "@shared/schema";

interface AIResumeChatProps {
  resumeId: string;
  resumeData: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
  onSwitchToManual: () => void;
  onComplete?: () => void;
  focusedComponent?: string; // For component-specific editing
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Components that can be selected
const RESUME_COMPONENTS = [
  { id: "experience", label: "Work Experience", description: "Your professional work history" },
  { id: "education", label: "Education", description: "Your academic background" },
  { id: "skills", label: "Skills", description: "Your technical and soft skills" },
  { id: "certifications", label: "Certifications", description: "Professional certifications" },
  { id: "projects", label: "Projects", description: "Personal or professional projects" },
  { id: "awards", label: "Awards & Honors", description: "Recognition and achievements" },
  { id: "leadership", label: "Leadership", description: "Leadership roles and positions" },
  { id: "research", label: "Research", description: "Research work and publications" },
  { id: "publications", label: "Publications", description: "Academic or professional publications" },
];

export default function AIResumeChat({ 
  resumeId, 
  resumeData, 
  onUpdate,
  onSwitchToManual,
  onComplete,
  focusedComponent
}: AIResumeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(true);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([
    "experience",
    "education",
    "skills",
  ]);
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pre-fill user info when component mounts
  useEffect(() => {
    if (user && resumeData.personalInfo.name === "" && resumeData.personalInfo.email === "") {
      onUpdate({
        personalInfo: {
          ...resumeData.personalInfo,
          name: user.name || "",
          email: user.email || "",
        },
      });
    }
  }, [user, resumeData, onUpdate]);

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

    // Only initialize if no messages yet
    if (messages.length === 0) {
      let greetingContent = "";
      
      if (focusedComponent) {
        // If in focused component mode, provide a specialized greeting
        const componentName = RESUME_COMPONENTS.find(c => c.id === focusedComponent)?.label || focusedComponent;
        greetingContent = `Hi ${firstName}! I see you want to edit your ${componentName}. What changes would you like to make? You can describe the edits or ask me questions about this section.`;
      } else {
        greetingContent = `Hi ${firstName}! I'm your AI resume assistant. I'll help you build a professional resume through a friendly conversation. First, select which sections you'd like to add to your resume, then we'll start collecting the information.`;
      }
      
      const greeting: ChatMessage = {
        role: "assistant",
        content: greetingContent,
        timestamp: new Date().toISOString(),
      };
      setMessages([greeting]);
      
      // If in focused mode, skip component selector
      if (focusedComponent) {
        setShowComponentSelector(false);
      }
    }
  }, [user, messages.length, focusedComponent]);

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
        selectedComponents,
        focusedComponent,
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

      // Handle dynamic component addition
      if (data.addedComponents && Array.isArray(data.addedComponents)) {
        setSelectedComponents((prev) => {
          const newComponents = [...prev];
          data.addedComponents.forEach((comp: string) => {
            if (!newComponents.includes(comp)) {
              newComponents.push(comp);
            }
          });
          return newComponents;
        });
      }

      // Check if conversation is complete
      if (data.isComplete) {
        setIsComplete(true);
        // Trigger completion callback if provided
        if (onComplete) {
          onComplete();
        }
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

  const handleComponentToggle = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleStartConversation = () => {
    setShowComponentSelector(false);
    
    // Send initial message to AI with selected components
    const componentsList = selectedComponents
      .map((id) => RESUME_COMPONENTS.find((c) => c.id === id)?.label)
      .join(", ");
    
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: `Great! We'll focus on: ${componentsList}. Your name and email are already filled in. Let's start with your professional summary. Can you tell me about your professional background and what you're looking for in your next role?`,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
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
              {isComplete ? "Resume complete!" : showComponentSelector ? "Select components" : "Building your resume..."}
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

      {/* Component Selector */}
      {showComponentSelector && (
        <div className="p-4 sm:p-6 border-b border-border bg-card">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">
              What would you like to include in your resume?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Select the sections you want to add. You can always add more later.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESUME_COMPONENTS.map((component) => (
                <div
                  key={component.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleComponentToggle(component.id)}
                >
                  <Checkbox
                    id={component.id}
                    checked={selectedComponents.includes(component.id)}
                    onCheckedChange={() => handleComponentToggle(component.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={component.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {component.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {component.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleStartConversation}
              disabled={selectedComponents.length === 0}
              className="w-full mt-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Building Resume
            </Button>
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">AI is thinking</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      {!showComponentSelector && (
        <div className="border-t border-border p-3 sm:p-4 bg-card">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isComplete ? "Chat complete!" : "Type your message..."}
              disabled={isLoading || isComplete}
              className="flex-1 text-sm h-10"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isComplete}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              aria-label="Send message"
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
      )}
    </div>
  );
}
