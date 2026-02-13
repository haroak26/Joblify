import { useState, useEffect, useCallback } from "react";
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
  Award,
  FolderGit2,
  Trophy,
  Users,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import type { Resume, ResumeData } from "@shared/schema";

// Resume section components
import PersonalInfoSection from "@/components/resume-sections/PersonalInfoSection";
import ExperienceSection from "@/components/resume-sections/ExperienceSection";
import EducationSection from "@/components/resume-sections/EducationSection";
import SkillsSection from "@/components/resume-sections/SkillsSection";
import SummarySection from "@/components/resume-sections/SummarySection";
import AwardsSection from "@/components/resume-sections/AwardsSection";
import CertificationsSection from "@/components/resume-sections/CertificationsSection";
import ProjectsSection from "@/components/resume-sections/ProjectsSection";
import LeadershipSection from "@/components/resume-sections/LeadershipSection";
import ResearchSection from "@/components/resume-sections/ResearchSection";
import PublicationsSection from "@/components/resume-sections/PublicationsSection";

// Resume preview component
import ResumePreview from "@/components/resume-preview/ResumePreview";

// AI Resume Chat component
import AIResumeChat from "@/components/AIResumeChat";

// Component Selector
import ComponentSelector from "@/components/ComponentSelector";

// Resume Compiling component
import ResumeCompiling from "@/components/ResumeCompiling";

// Loading skeleton
import { ResumeEditorSkeleton } from "@/components/loading-skeleton";

type ResumeSection = {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
};

const DEFAULT_SECTIONS = ["personal", "summary", "experience", "education", "skills"];

const allSections: ResumeSection[] = [
  { id: "personal", name: "Personal Info", icon: User, component: PersonalInfoSection },
  { id: "summary", name: "Summary", icon: FileText, component: SummarySection },
  { id: "experience", name: "Experience", icon: Briefcase, component: ExperienceSection },
  { id: "education", name: "Education", icon: GraduationCap, component: EducationSection },
  { id: "skills", name: "Skills", icon: Sparkles, component: SkillsSection },
  { id: "certifications", name: "Certifications", icon: Award, component: CertificationsSection },
  { id: "projects", name: "Projects", icon: FolderGit2, component: ProjectsSection },
  { id: "awards", name: "Awards", icon: Trophy, component: AwardsSection },
  { id: "leadership", name: "Leadership", icon: Users, component: LeadershipSection },
  { id: "research", name: "Research", icon: FlaskConical, component: ResearchSection },
  { id: "publications", name: "Publications", icon: BookOpen, component: PublicationsSection },
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
  const [aiEditingComponent, setAiEditingComponent] = useState<string | undefined>(undefined);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

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

  // Show component selector when entering AI mode for the first time
  useEffect(() => {
    if (isAIMode && resumeData && selectedComponents.length === 0) {
      setShowComponentSelector(true);
    }
  }, [isAIMode, resumeData, selectedComponents.length]);

  // Determine which sections to display in sidebar
  const getVisibleSections = () => {
    // In manual mode, show all sections that have data or are default sections or are selected
    if (!isAIMode) {
      return allSections.filter(section => {
        // Always show default sections
        if (DEFAULT_SECTIONS.includes(section.id)) return true;
        
        // Show if selected via component selector
        if (selectedComponents.includes(section.id)) return true;
        
        // Show optional sections if they have data
        if (section.id === "certifications" && resumeData?.certifications && resumeData.certifications.length > 0) return true;
        if (section.id === "projects" && resumeData?.projects && resumeData.projects.length > 0) return true;
        if (section.id === "awards" && resumeData?.awards && resumeData.awards.length > 0) return true;
        if (section.id === "leadership" && resumeData?.leadership && resumeData.leadership.length > 0) return true;
        if (section.id === "research" && resumeData?.research && resumeData.research.length > 0) return true;
        if (section.id === "publications" && resumeData?.publications && resumeData.publications.length > 0) return true;
        
        return false;
      });
    }
    
    // In AI mode, sidebar is hidden, so return empty array
    return [];
  };

  const visibleSections = getVisibleSections();

  // Pre-fill user data in traditional mode
  useEffect(() => {
    if (!isAIMode && resumeData && user && !userDataPrefilled) {
      // Check if personal info is empty and user data is available
      const nameEmpty = !resumeData.personalInfo.name || resumeData.personalInfo.name.trim() === "";
      const emailEmpty = !resumeData.personalInfo.email || resumeData.personalInfo.email.trim() === "";
      
      if (nameEmpty && emailEmpty) {
        setResumeData((prev) => ({
          ...prev!,
          personalInfo: {
            ...prev!.personalInfo,
            name: user.name || "",
            email: user.email || "",
          },
        }));
        setUserDataPrefilled(true);
        // Auto-save pre-filled data without marking as unsaved
        saveResumeMutation.mutate({
          resumeData: {
            ...resumeData,
            personalInfo: {
              ...resumeData.personalInfo,
              name: user.name || "",
              email: user.email || "",
            },
          },
        });
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

  const updateResumeData = useCallback((data: Partial<ResumeData>) => {
    setResumeData((prev) => ({
      ...prev!,
      ...data,
    }));
  }, []);

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

  const handleComponentsSelected = (components: string[]) => {
    setSelectedComponents(components);
    // In manual mode, when components are selected, navigate to the first one
    if (!isAIMode && components.length > 0) {
      const firstNewComponent = components.find(c => !DEFAULT_SECTIONS.includes(c));
      if (firstNewComponent) {
        setActiveSection(firstNewComponent);
      }
    }
  };

  const handleEditComponents = () => {
    setShowComponentSelector(true);
  };

  const handleAIComplete = () => {
    // Navigate to compiling screen
    setLocation(`/dashboard/resume-builder/${resumeId}?compiling=true`);
  };

  const ActiveSectionComponent = allSections.find((s) => s.id === activeSection)?.component;

  if (isLoading) {
    return <ResumeEditorSkeleton />;
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

  // Responsive class names for better maintainability
  const sidebarClasses = [
    "w-full md:w-48",                    // Width: full on mobile, fixed on desktop
    "border-b md:border-b-0 md:border-r", // Border: bottom on mobile, right on desktop
    "border-border bg-card",              // Theme colors
    "flex flex-col",                      // Flexbox layout
    "max-h-[40vh] md:max-h-none",        // Height: constrained on mobile, full on desktop
    "overflow-y-auto md:overflow-visible" // Scroll behavior
  ].join(" ");

  const headerClasses = [
    "min-h-[56px] md:h-16",              // Height: flexible on mobile, fixed on desktop
    "border-b border-border bg-card",     // Border and theme
    "flex items-center justify-between",  // Flexbox layout
    "px-3 sm:px-6",                       // Horizontal padding
    isAIMode ? 'hidden md:flex' : 'flex'  // Conditional visibility in AI mode
  ].join(" ");

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      {/* Conditionally render sidebar only in manual mode */}
      {!isAIMode && (
        <div className={sidebarClasses}>
          <div className="p-4 border-b border-border">
            <h2 className="text-small font-semibold text-foreground">Components</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {visibleSections.map((section) => {
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
                        setActiveSection("ai-chat");
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                      title="Edit with AI"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                );
              })}
              
              {/* Add Component button */}
              <button
                onClick={() => {
                  // Pre-populate with currently visible optional sections
                  const currentOptionalSections = visibleSections
                    .filter(s => !DEFAULT_SECTIONS.includes(s.id))
                    .map(s => s.id);
                  // Check if arrays have the same elements (order-independent)
                  const arraysEqual = currentOptionalSections.length === selectedComponents.length &&
                    currentOptionalSections.every(s => selectedComponents.includes(s)) &&
                    selectedComponents.every(s => currentOptionalSections.includes(s));
                  if (!arraysEqual) {
                    setSelectedComponents(currentOptionalSections);
                  }
                  setShowComponentSelector(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-small text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="flex-1 text-left">Add Section</span>
              </button>
              
              <div className="py-2">
                <Separator />
              </div>
              
              {/* AI Enhancement button - moved below components */}
              <button
                onClick={() => setActiveSection("ai-chat")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-small transition-colors ${
                  activeSection === "ai-chat"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="flex-1 text-left">AI Enhancement</span>
              </button>
            </div>
          </ScrollArea>
          
          {/* Bottom section */}
          <div className="border-t border-border hidden md:block">
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
        {/* Header */}
        <div className={headerClasses}>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isEditingTitle ? (
              <Input
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingTitle(false);
                }}
                className="max-w-[150px] sm:max-w-md h-8 text-sm"
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
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm h-8" aria-label="Save resume">
              <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            
            {/* Template Selector */}
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs sm:text-sm">
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
                onClick={() => setActiveSection("ai-chat")}
                className="text-xs sm:text-sm h-8 hidden sm:flex"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Enhancement</span>
              </Button>
            )}
            
            <Button size="sm" onClick={handleDownloadPDF} className="h-8 hidden sm:flex">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
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
                  selectedComponents={selectedComponents}
                  onEditComponents={handleEditComponents}
                  onAutoSave={handleSave}
                />
              </div>
              {/* Preview in AI mode - hidden on mobile and tablet, shown on large desktop */}
              <div className="hidden xl:block w-[600px] xl:border-l border-border bg-muted/30 overflow-auto p-6">
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
              {/* Editor Section - now responsive */}
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                {activeSection === "ai-chat" ? (
                  <AIResumeChat
                    resumeId={resumeId!}
                    resumeData={resumeData}
                    onUpdate={updateResumeData}
                    onSwitchToManual={() => setActiveSection("personal")}
                    focusedComponent={aiEditingComponent}
                    onAutoSave={handleSave}
                  />
                ) : ActiveSectionComponent ? (
                  <ActiveSectionComponent
                    data={resumeData}
                    onUpdate={updateResumeData}
                  />
                ) : null}
              </div>

              {/* Live Preview Section - responsive: hidden on mobile, shown on large screens */}
              <div className="hidden xl:block w-[600px] xl:border-l border-border bg-muted/30 overflow-auto p-6">
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

      {/* Component Selector Dialog */}
      <ComponentSelector
        open={showComponentSelector}
        onOpenChange={setShowComponentSelector}
        onSelect={handleComponentsSelected}
        initialComponents={selectedComponents}
      />
    </div>
  );
}
