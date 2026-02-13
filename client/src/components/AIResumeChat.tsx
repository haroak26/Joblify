import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, User as UserIcon, Edit3, X, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCsrfToken } from "@/lib/queryClient";
import type { ResumeData } from "@shared/schema";
import ReactMarkdown from "react-markdown";

interface AIResumeChatProps {
  resumeId: string;
  resumeData: ResumeData | null;
  onUpdate: (data: Partial<ResumeData>) => void;
  onSwitchToManual: () => void;
  onComplete?: () => void;
  focusedComponent?: string;
  selectedComponents?: string[];
  onEditComponents?: () => void;
  onAutoSave?: () => void;
  mode?: "builder" | "enhancement"; // New prop to distinguish between modes
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  id: string;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES = 10;
const ENHANCEMENT_WELCOME_MESSAGE = "I'm your AI assistant ready to help improve and polish your existing resume. You can ask me to refine any section, suggest improvements, or enhance specific parts of your content. What would you like to work on?";

const COMPONENT_LABELS: Record<string, string> = {
  personal: "Personal Info",
  summary: "Professional Summary",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  projects: "Projects",
  awards: "Awards & Honors",
  leadership: "Leadership",
  research: "Research",
  publications: "Publications",
};

// Sections restricted on free plan in AI builder
const FREE_PLAN_RESTRICTED_SECTIONS = ["awards", "certifications", "leadership", "research", "publications"];

export default function AIResumeChat({
  resumeId,
  resumeData,
  onUpdate,
  onSwitchToManual,
  onComplete,
  focusedComponent,
  selectedComponents = [],
  onEditComponents,
  onAutoSave,
  mode = "enhancement", // Default to enhancement mode
}: AIResumeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [activeComponents, setActiveComponents] = useState<string[]>(selectedComponents);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [editingSection, setEditingSection] = useState<string | undefined>(focusedComponent);
  const hasShownGreetingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevComponentsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user subscription for free plan restrictions
  const { data: subscriptionData } = useQuery<{ subscription: { plan: string } }>({
    queryKey: ["/api/subscription"],
  });
  const userPlan = subscriptionData?.subscription?.plan || "free";
  const isFreePlan = userPlan === "free";
  const isGuidedBuilder = mode === "builder" || (activeComponents.length > 0 && !focusedComponent);

  // Save a single message to the database live
  const saveMessageToDb = useCallback(async (role: "user" | "ai", content: string) => {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      await fetch(`/api/resumes/${resumeId}/conversation/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ role, content }),
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to save message to DB:", error);
    }
  }, [resumeId]);

  // Load saved conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}/conversation`, {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const loadedMessages = data.messages.map((msg: { role: string; content: string }, index: number) => {
              const role = msg.role === "user" || msg.role === "ai" ? msg.role : "ai";
              if (msg.role !== "user" && msg.role !== "ai") {
                console.warn(`Invalid message role detected: "${msg.role}". Defaulting to "ai".`);
              }
              return {
                role,
                content: msg.content,
                id: `${role}-${Date.now()}-${index}`,
              };
            });
            setMessages(loadedMessages);
            setHasInteracted(true);
          }
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [resumeId]);

  // Update activeComponents when selectedComponents prop changes
  useEffect(() => {
    prevComponentsRef.current = selectedComponents;
    setActiveComponents(selectedComponents);
  }, [selectedComponents]);

  // Auto-scroll during streaming and when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Update editingSection when focusedComponent changes
  useEffect(() => {
    if (focusedComponent) {
      setEditingSection(focusedComponent);
    }
  }, [focusedComponent]);

  // Initial greeting and user data prefill
  useEffect(() => {
    if (isLoadingConversation || messages.length > 0 || !resumeData || !user || hasShownGreetingRef.current) {
      return;
    }
    
    hasShownGreetingRef.current = true;
    
    const firstName = user.name?.split(" ")[0] || user.username || "there";
    
    const shouldPrefillName = !resumeData.personalInfo?.name && user.name;
    const shouldPrefillEmail = !resumeData.personalInfo?.email && user.email;
    
    if (shouldPrefillName || shouldPrefillEmail) {
      const updates: any = { personalInfo: { ...resumeData.personalInfo } };
      if (shouldPrefillName) updates.personalInfo.name = user.name;
      if (shouldPrefillEmail) updates.personalInfo.email = user.email;
      onUpdate(updates);
    }
    
    const greeting = focusedComponent
      ? `Welcome ${firstName}! I'm here to help you polish and improve your ${COMPONENT_LABELS[focusedComponent] || focusedComponent}. Let me know what changes you'd like to make, or I can suggest improvements!`
      : mode === "builder"
      ? `Welcome back ${firstName}! I'm your **AI Resume Builder** assistant. Let's continue building the sections you started.\n\nWhat would you like to work on next?`
      : isGuidedBuilder
      ? `Welcome ${firstName}! I'm your **AI Resume Builder** assistant, and I'm excited to help you create a professional resume from scratch.\n\nI already have your name and email. Let's start building your resume together!\n\n**What's your current or most recent job title?** (For example: Software Engineer, Marketing Manager, Data Analyst, etc.)`
      : `Welcome ${firstName}! I'm your **AI Enhancement** assistant. ${ENHANCEMENT_WELCOME_MESSAGE}`;
    
    const greetingMsg: ChatMessage = { role: "ai", content: greeting, id: Date.now().toString() };
    setMessages([greetingMsg]);
    // Save greeting to DB
    saveMessageToDb("ai", greeting);
  }, [isLoadingConversation, messages.length, resumeData, user, focusedComponent, isGuidedBuilder, onUpdate, saveMessageToDb]);

  // Streaming send message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const messageText = inputMessage.trim().slice(0, MAX_MESSAGE_LENGTH);
    setInputMessage("");

    // Add user message
    const userMessage: ChatMessage = { 
      role: "user", 
      content: messageText,
      id: `user-${Date.now()}`
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Save user message to DB immediately
    saveMessageToDb("user", messageText);

    // Track usage on first interaction
    if (!hasInteracted) {
      setHasInteracted(true);
      fetch('/api/track-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureName: 'resume_builder' }),
        credentials: 'include',
      }).catch(() => {});
    }

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`/api/resumes/${resumeId}/ai-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: messageText,
          focusedComponent: editingSection,
          selectedComponents: activeComponents,
          currentData: resumeData,
          conversationHistory: messages.slice(-MAX_MESSAGES).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please log in again.");
        if (response.status === 403) throw new Error("You don't have permission to perform this action.");
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream available");
      }

      let fullStreamedText = "";
      let doneData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === "token") {
                fullStreamedText += eventData.content;
                setStreamingContent(fullStreamedText);
              } else if (eventData.type === "done") {
                doneData = eventData;
              } else if (eventData.type === "error") {
                throw new Error(eventData.message);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                if (import.meta.env.DEV) {
                  console.warn("Skipping malformed SSE event:", line.slice(6));
                }
                continue;
              }
              throw parseError;
            }
          }
        }
      }

      // Use the reply from done event, or the streamed text
      const aiReply = doneData?.reply || fullStreamedText || "I understand. Could you tell me more?";

      // Add AI response as a proper message
      setMessages((prev) => [...prev, { role: "ai", content: aiReply, id: `ai-${Date.now()}` }]);
      setStreamingContent("");

      // Save AI response to DB
      saveMessageToDb("ai", aiReply);

      // Apply structured updates from the done event
      if (doneData) {
        if (doneData.updatedData && Object.keys(doneData.updatedData).length > 0) {
          onUpdate(doneData.updatedData);
          if (onAutoSave) {
            setTimeout(() => onAutoSave(), 500);
          }
        }

        if (doneData.addedComponents && doneData.addedComponents.length > 0) {
          setActiveComponents((prev) => {
            const newComponents = doneData.addedComponents.filter((c: string) => !prev.includes(c));
            if (newComponents.length > 0) {
              toast({ title: "Components Added", description: `Added: ${newComponents.join(', ')}` });
              return [...prev, ...newComponents];
            }
            return prev;
          });
        }

        if (doneData.isComplete) {
          setIsComplete(true);
          setTimeout(() => {
            toast({ title: "Resume Complete!", description: "Your resume is ready. Redirecting to compilation..." });
            if (onComplete) onComplete();
          }, 2000);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast({
        title: "Message Failed",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputMessage, isStreaming, resumeId, editingSection, activeComponents, resumeData, messages, hasInteracted, onUpdate, onAutoSave, onComplete, toast, saveMessageToDb]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clicking a section from the preview to set editing context
  const handleSetEditingSection = useCallback((sectionId: string) => {
    setEditingSection(sectionId);
  }, []);

  const handleClearEditingSection = useCallback(() => {
    setEditingSection(undefined);
  }, []);

  // Filter restricted sections for free plan in AI builder mode
  const getFilteredComponents = () => {
    if (!isFreePlan || !isGuidedBuilder) return activeComponents;
    return activeComponents.filter(c => !FREE_PLAN_RESTRICTED_SECTIONS.includes(c));
  };

  const filteredComponents = getFilteredComponents();
  const restrictedSections = isFreePlan && isGuidedBuilder 
    ? activeComponents.filter(c => FREE_PLAN_RESTRICTED_SECTIONS.includes(c))
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex flex-col p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">
                {isGuidedBuilder ? "AI Resume Builder" : "AI Resume Enhancement"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {editingSection 
                  ? `Editing: ${COMPONENT_LABELS[editingSection] || editingSection}` 
                  : isGuidedBuilder
                  ? "Building your resume step-by-step"
                  : "Polish and improve your resume"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGuidedBuilder && onEditComponents && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditComponents}
                className="flex items-center gap-1"
                title="Edit selected sections"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Sections</span>
              </Button>
            )}
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
        </div>

        {/* Active sections chips in AI builder mode */}
        {isGuidedBuilder && filteredComponents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {filteredComponents.map((comp) => (
              <span
                key={comp}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
              >
                {COMPONENT_LABELS[comp] || comp}
              </span>
            ))}
            {restrictedSections.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground" title="Upgrade to Plus or Ultra to access these sections via AI">
                +{restrictedSections.length} (upgrade required)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4" ref={scrollContainerRef}>
        <div className="space-y-4 max-w-3xl mx-auto" ref={scrollRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "ai" ? "bg-primary" : "bg-primary"
                }`}
              >
                {message.role === "ai" ? (
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <UserIcon className="w-4 h-4 text-primary-foreground" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-12 rounded-tl-lg rounded-tr-sm rounded-b-lg"
                    : "bg-muted mr-12 rounded-tl-sm rounded-tr-lg rounded-b-lg"
                }`}
              >
                {message.role === "ai" ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming AI Response */}
          {isStreaming && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 bg-muted rounded-tl-sm rounded-tr-lg rounded-b-lg p-3 mr-12">
                {streamingContent ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                    <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">Generating response...</span>
                  </div>
                )}
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
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <div className="max-w-3xl mx-auto">
          {/* Editing section tag */}
          {editingSection && !isGuidedBuilder && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                <Sparkles className="w-3 h-3" />
                Editing: {COMPONENT_LABELS[editingSection] || editingSection}
                <button
                  onClick={handleClearEditingSection}
                  className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  title="Clear editing focus"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          {/* Free plan restriction notice */}
          {isFreePlan && isGuidedBuilder && restrictedSections.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              Upgrade to Plus or Ultra to use AI for {restrictedSections.map(s => COMPONENT_LABELS[s] || s).join(', ')} sections.
            </p>
          )}

          <div className="relative flex items-center">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isComplete ? "Resume complete!" : editingSection && !isGuidedBuilder ? `Ask about ${COMPONENT_LABELS[editingSection] || editingSection}...` : "Type your message..."}
              disabled={isStreaming || isComplete}
              maxLength={MAX_MESSAGE_LENGTH}
              className="flex-1 pr-12 h-11"
            />
            <div className="absolute right-1.5 flex items-center">
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming || isComplete}
                size="icon"
                className="h-8 w-8"
              >
                {isStreaming ? (
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
    </div>
  );
}
