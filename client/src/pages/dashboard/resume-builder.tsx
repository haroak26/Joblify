import { useState, useEffect } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  Download,
  MessageSquare,
  ChevronLeft,
  Plus,
  Save,
  Settings,
  Palette,
  Home,
  X,
} from "lucide-react";
import type { Resume, ResumeData } from "@shared/schema";

// Resume section components
import PersonalInfoSection from "@/components/resume-sections/PersonalInfoSection";
import ExperienceSection from "@/components/resume-sections/ExperienceSection";
import EducationSection from "@/components/resume-sections/EducationSection";
import SkillsSection from "@/components/resume-sections/SkillsSection";
import SummarySection from "@/components/resume-sections/SummarySection";

// Resume preview component
import ResumePreview from "@/components/resume-preview/ResumePreview";

// AI Resume Chat component
import AIResumeChat from "@/components/AIResumeChat";

// Resume Compiling component
import ResumeCompiling from "@/components/ResumeCompiling";

type ResumeSection = {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
};

const sections: ResumeSection[] = [
  { id: "personal", name: "Personal Info", icon: User, component: PersonalInfoSection },
  { id: "summary", name: "Summary", icon: FileText, component: SummarySection },
  { id: "experience", name: "Experience", icon: Briefcase, component: ExperienceSection },
  { id: "education", name: "Education", icon: GraduationCap, component: EducationSection },
  { id: "skills", name: "Skills", icon: Sparkles, component: SkillsSection },
];

export default function ResumeBuilder() {
  const [, params] = useRoute("/dashboard/resume-builder/:id");
  const resumeId = params?.id;
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if AI mode is enabled via query parameter
  const isAIMode = search.includes("mode=ai");
  const isCompiling = search.includes("compiling=true");
  
  const [activeSection, setActiveSection] = useState<string>("personal");
  const [resumeTitle, setResumeTitle] = useState<string>("Untitled Resume");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [userDataPrefilled, setUserDataPrefilled] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiEditingComponent, setAiEditingComponent] = useState<string | undefined>(undefined);

  // Fetch resume data
  const { data: resume, isLoading } = useQuery<Resume>({
    queryKey: [`/api/resumes/${resumeId}`],
    enabled: !!resumeId,
  });

  // Update local state when resume data is fetched
  useEffect(() => {
    if (resume) {
      setResumeData(resume.resumeData);
      setResumeTitle(resume.title);
      setSelectedTemplate(resume.template || "modern");
    }
  }, [resume]);

  // Pre-fill user data in traditional mode
  useEffect(() => {
    if (!isAIMode && resumeData && user && !userDataPrefilled) {
      // Check if personal info is empty and user data is available
      if (resumeData.personalInfo.name === "" && resumeData.personalInfo.email === "") {
        setResumeData((prev) => ({
          ...prev!,
          personalInfo: {
            ...prev!.personalInfo,
            name: user.name || "",
            email: user.email || "",
          },
        }));
        setUserDataPrefilled(true);
        setHasUnsavedChanges(true);
      }
    }
  }, [isAIMode, resumeData, user, userDataPrefilled]);

  // Save resume mutation
  const saveResumeMutation = useMutation({
    mutationFn: async (data: Partial<Resume>) => {
      const response = await apiRequest("PATCH", `/api/resumes/${resumeId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}`] });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !resumeData) return;
    
    const autoSaveTimer = setTimeout(() => {
      setIsSaving(true);
      saveResumeMutation.mutate({
        title: resumeTitle,
        resumeData,
        template: selectedTemplate,
      });
    }, 30000); // 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, resumeData, resumeTitle, selectedTemplate]);

  // Mark as having unsaved changes when data changes
  useEffect(() => {
    if (resumeData && resume) {
      setHasUnsavedChanges(true);
    }
  }, [resumeData, resumeTitle, selectedTemplate, resume]);

  const handleSave = () => {
    if (!resumeData) return;
    setIsSaving(true);
    saveResumeMutation.mutate({
      title: resumeTitle,
      resumeData,
      template: selectedTemplate,
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiRequest("POST", `/api/resumes/${resumeId}/pdf`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resumeTitle.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "Your resume has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateResumeData = (data: Partial<ResumeData>) => {
    setResumeData((prev) => ({
      ...prev!,
      ...data,
    }));
  };

  const getSaveStatus = () => {
    if (isSaving) return "Saving...";
    if (hasUnsavedChanges) return "Unsaved changes";
    if (lastSaved) return `Saved ${new Date(lastSaved).toLocaleTimeString()}`;
    return "";
  };

  const handleSwitchToManual = () => {
    // Remove mode=ai from URL to switch to manual mode
    setLocation(`/dashboard/resume-builder/${resumeId}`);
  };

  const handleAIComplete = () => {
    // Navigate to compiling screen
    setLocation(`/dashboard/resume-builder/${resumeId}?compiling=true`);
  };

  const ActiveSectionComponent = sections.find((s) => s.id === activeSection)?.component;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading resume...</div>
      </div>
    );
  }

  if (!resume || !resumeData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Resume not found</div>
      </div>
    );
  }

  // Show compiling screen if in compiling mode
  if (isCompiling) {
    return <ResumeCompiling resumeId={resumeId!} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Conditionally render sidebar only in manual mode */}
      {!isAIMode && (
        <div className="w-48 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-small font-semibold text-foreground">Components</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.id} className="relative group">
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-small transition-colors ${
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{section.name}</span>
                    </button>
                    <button
                      onClick={() => {
                        setAiEditingComponent(section.id);
                        setShowAIAssistant(true);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                      title="Edit with AI"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Bottom section */}
          <div className="border-t border-border">
            <div className="p-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setLocation("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Hidden on mobile in AI mode */}
        <div className={`h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 ${isAIMode ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isEditingTitle ? (
              <Input
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingTitle(false);
                }}
                className="max-w-[200px] sm:max-w-md h-8 text-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-sm sm:text-body font-semibold hover:text-primary transition-colors truncate"
              >
                {resumeTitle}
              </button>
            )}
            {/* Save status indicator */}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {getSaveStatus()}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm" aria-label="Save resume">
              <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            
            {/* Template Selector */}
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 sm:h-9 text-xs sm:text-sm">
                <Palette className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
            
            {!isAIMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIAssistant(true)}
                className="text-xs sm:text-sm"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Help</span>
              </Button>
            )}
            
            <Button size="sm" onClick={handleDownloadPDF} className="hidden sm:flex">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conditionally render AI Chat or Manual Editor */}
          {isAIMode ? (
            <>
              <div className="flex-1 overflow-hidden">
                <AIResumeChat
                  resumeId={resumeId!}
                  resumeData={resumeData}
                  onUpdate={updateResumeData}
                  onSwitchToManual={handleSwitchToManual}
                  onComplete={handleAIComplete}
                />
              </div>
              {/* Preview in AI mode - hidden on mobile, shown on desktop */}
              <div className="hidden lg:block w-[600px] border-l border-border bg-muted/30 overflow-auto p-6">
                <div className="sticky top-0">
                  <ResumePreview
                    data={resumeData}
                    template={selectedTemplate}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Editor Section - hidden on mobile, shown on desktop */}
              <div className="hidden md:block flex-1 overflow-auto p-6">
                {ActiveSectionComponent && (
                  <ActiveSectionComponent
                    data={resumeData}
                    onUpdate={updateResumeData}
                  />
                )}
              </div>

              {/* Mobile view - show message to use desktop */}
              <div className="md:hidden flex-1 overflow-auto p-6 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <Settings className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Desktop Required for Editing</h3>
                  <p className="text-sm text-muted-foreground">
                    Manual resume editing is optimized for desktop screens. Please use a desktop or laptop computer to edit your resume, or try our AI Chat mode for a mobile-friendly experience.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/dashboard/resume-builder/${resumeId}?mode=ai`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Switch to AI Chat
                  </Button>
                </div>
              </div>

              {/* Live Preview Section - hidden on mobile */}
              <div className="hidden md:block w-[600px] border-l border-border bg-muted/30 overflow-auto p-6">
                <div className="sticky top-0">
                  <ResumePreview
                    data={resumeData}
                    template={selectedTemplate}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant Overlay for Manual Mode */}
      {!isAIMode && showAIAssistant && resumeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl h-[80vh] bg-background rounded-lg shadow-lg flex flex-col m-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold">AI Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAIAssistant(false);
                  setAiEditingComponent(undefined);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* AI Chat Component */}
            <div className="flex-1 overflow-hidden">
              <AIResumeChat
                resumeId={resumeId!}
                resumeData={resumeData}
                onUpdate={updateResumeData}
                onSwitchToManual={() => {
                  setShowAIAssistant(false);
                  setAiEditingComponent(undefined);
                }}
                focusedComponent={aiEditingComponent}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
