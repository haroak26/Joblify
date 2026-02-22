import { useState, useEffect, useCallback, useRef } from "react";
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
const DEFAULT_AI_COMPONENTS = ["summary", "experience", "education", "skills"];

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
  const [resumeTitle, setResumeTitle] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [userDataPrefilled, setUserDataPrefilled] = useState(false);
  const [aiEditingComponent, setAiEditingComponent] = useState<string | undefined>(undefined);
  const [aiMode, setAiMode] = useState<"enhancement" | "builder">("enhancement"); // Track which AI mode is active
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [hasShownAISelector, setHasShownAISelector] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<string[]>(
    isAIMode ? DEFAULT_AI_COMPONENTS : []
  );
  const [previewMode, setPreviewMode] = useState<"template" | "original" | "compare">("template");

  // Ref for hidden print container used by client-side PDF generation
  const printRef = useRef<HTMLDivElement>(null);
  const visiblePreviewRef = useRef<HTMLDivElement>(null);

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
      
      // Load AI Builder components if they exist
      if (resume.aiBuilderComponents && Array.isArray(resume.aiBuilderComponents)) {
        setSelectedComponents(resume.aiBuilderComponents);
      }
    }
  }, [resume]);
  
  // Fetch user subscription for plan-based restrictions
  const { data: subscriptionData } = useQuery<{ subscription: { plan: string } }>({
    queryKey: ["/api/subscription"],
  });
  const userPlan = subscriptionData?.subscription?.plan || "free";
  
  // Calculate if Builder AI is available and which sections are incomplete
  const builderAIAvailable = resume && 
    resume.aiBuilderComponents && 
    Array.isArray(resume.aiBuilderComponents) &&
    resume.aiBuilderComponents.length > 0 &&
    !resume.aiBuilderCompleted;
    
  const incompleteBuilderSections = builderAIAvailable
    ? (resume?.aiBuilderComponents || []).filter((componentId: string) => {
        const data = resumeData;
        if (!data) return true;
        
        // Check if section has content
        switch (componentId) {
          case "summary":
            return !data.summary || data.summary.trim() === "";
          case "experience":
            return !data.experience || data.experience.length === 0;
          case "education":
            return !data.education || data.education.length === 0;
          case "skills":
            return !data.skills || data.skills.length === 0;
          case "certifications":
            return !data.certifications || data.certifications.length === 0;
          case "projects":
            return !data.projects || data.projects.length === 0;
          case "awards":
            return !data.awards || data.awards.length === 0;
          case "leadership":
            return !data.leadership || data.leadership.length === 0;
          case "research":
            return !data.research || data.research.length === 0;
          case "publications":
            return !data.publications || data.publications.length === 0;
          default:
            return false;
        }
      })
    : [];

  // Show component selector when entering AI mode for the first time
  useEffect(() => {
    if (isAIMode && resumeData && !hasShownAISelector) {
      setHasShownAISelector(true);
      setShowComponentSelector(true);
    }
  }, [isAIMode, resumeData, hasShownAISelector]);

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
      // Don't invalidate query to prevent refetching and state reset
      // The local state is already up-to-date with what we just saved
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

  // Auto-save every 5 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !resumeData) return;
    
    const autoSaveTimer = setTimeout(() => {
      setIsSaving(true);
      saveResumeMutation.mutate({
        title: resumeTitle,
        resumeData,
        template: selectedTemplate,
      });
    }, 5000); // 5 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, resumeData, resumeTitle, selectedTemplate]);

  // Mark as having unsaved changes when data changes
  useEffect(() => {
    if (resumeData && resume) {
      setHasUnsavedChanges(true);
    }
  }, [resumeData, resumeTitle, selectedTemplate, resume]);

  // Auto-mark builder as completed when all selected sections have data
  const incompleteCount = incompleteBuilderSections.length;
  useEffect(() => {
    if (
      builderAIAvailable &&
      incompleteCount === 0 &&
      resume &&
      !resume.aiBuilderCompleted &&
      resumeData
    ) {
      saveResumeMutation.mutate({
        aiBuilderCompleted: true,
      });
    }
  }, [incompleteCount, builderAIAvailable, resume?.aiBuilderCompleted, resumeData]);

  const handleSave = () => {
    if (!resumeData) return;
    console.log("[ResumeBuilder] Saving resume data:", resumeData);
    setIsSaving(true);
    saveResumeMutation.mutate({
      title: resumeTitle,
      resumeData,
      template: selectedTemplate,
    });
  };

  const handleDownloadPDF = async () => {
    let temporaryContainer: HTMLDivElement | null = null;
    try {
      const visiblePreview = visiblePreviewRef.current;
      const fallbackPreview = printRef.current;
      const sourcePreview = visiblePreview || fallbackPreview;

      if (!sourcePreview) {
        throw new Error("Print container not found");
      }

      const sourceWidth = Math.ceil(sourcePreview.getBoundingClientRect().width || sourcePreview.scrollWidth);

      temporaryContainer = document.createElement("div");
      temporaryContainer.style.position = "fixed";
      temporaryContainer.style.left = "-99999px";
      temporaryContainer.style.top = "0";
      temporaryContainer.style.width = `${sourceWidth}px`;
      temporaryContainer.style.backgroundColor = "#ffffff";
      temporaryContainer.style.zIndex = "-1";

      const previewClone = sourcePreview.cloneNode(true) as HTMLDivElement;
      previewClone.style.width = "100%";
      previewClone.style.maxWidth = "none";
      temporaryContainer.appendChild(previewClone);
      document.body.appendChild(temporaryContainer);

      // Dynamically import html2canvas and jsPDF for client-side PDF generation
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Capture the resume preview at high resolution
      const canvas = await html2canvas(temporaryContainer, {
        scale: 2, // Standardize scale for consistency
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 816, // Fixed width for 8.5in at 96dpi
        height: Math.ceil(temporaryContainer.scrollHeight),
        windowWidth: 816,
        onclone: (clonedDoc) => {
          const root = clonedDoc.querySelector('[data-resume-preview-root="true"]') as HTMLElement;
          if (root) {
            root.style.width = '816px';
            root.style.minHeight = '1056px';
            root.style.margin = '0';
            root.style.padding = '0';
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 8.5;
      const pdfHeight = 11;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      // Scale the canvas image to fit the PDF page
      const canvasAspect = canvas.height / canvas.width;

      let renderWidth = pdfWidth;
      let renderHeight = pdfWidth * canvasAspect;

      // If content is taller than one page, scale to fit width and add pages
      if (renderHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, renderWidth, renderHeight);
      } else {
        // For multi-page content, split across pages
        const pageHeightInCanvasPixels = (pdfHeight / pdfWidth) * canvas.width;
        let yOffset = 0;
        let pageIndex = 0;

        while (yOffset < canvas.height) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          // Create a temporary canvas for this page slice
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          const sliceHeight = Math.min(pageHeightInCanvasPixels, canvas.height - yOffset);
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
            const pageImgData = pageCanvas.toDataURL("image/png");
            const imgHeight = (sliceHeight / canvas.width) * pdfWidth;
            pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, imgHeight);
          } else {
            console.warn("[PDF] Failed to get canvas context for page", pageIndex + 1);
          }

          yOffset += pageHeightInCanvasPixels;
          pageIndex++;
        }
      }

      const filename = `${resumeData?.personalInfo?.name || resumeTitle}_resume.pdf`
        .replace(/[^a-z0-9\s-]/gi, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      pdf.save(filename);
      
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
    } finally {
      if (temporaryContainer && temporaryContainer.parentNode) {
        temporaryContainer.parentNode.removeChild(temporaryContainer);
      }
    }
  };

  const updateResumeData = useCallback((data: Partial<ResumeData>) => {
    console.log("[ResumeBuilder] Updating resume data with:", data);
    setResumeData((prev) => {
      if (!prev) return data as ResumeData;
      // Deep merge personalInfo to prevent name/email from being overwritten
      const mergedPersonalInfo = data.personalInfo
        ? { ...prev.personalInfo, ...data.personalInfo }
        : prev.personalInfo;
      // Preserve name and email: never allow them to become empty if they were set
      if (prev.personalInfo?.name && (!mergedPersonalInfo.name || mergedPersonalInfo.name.trim() === "")) {
        mergedPersonalInfo.name = prev.personalInfo.name;
      }
      if (prev.personalInfo?.email && (!mergedPersonalInfo.email || mergedPersonalInfo.email.trim() === "")) {
        mergedPersonalInfo.email = prev.personalInfo.email;
      }
      const updated = {
        ...prev,
        ...data,
        personalInfo: mergedPersonalInfo,
      };
      console.log("[ResumeBuilder] New resume data:", updated);
      return updated;
    });
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
    
    // If in AI mode, save the selected components to the database as AI Builder metadata
    if (isAIMode && resumeId) {
      saveResumeMutation.mutate({
        aiBuilderComponents: components,
        aiBuilderCompleted: false,
      });
    }
  };

  const handleEditComponents = () => {
    setShowComponentSelector(true);
  };

  const handleAIComplete = () => {
    // Mark AI Builder as completed
    if (isAIMode && resumeId) {
      saveResumeMutation.mutate({
        aiBuilderCompleted: true,
      });
    }
    // Navigate to compiling screen
    setLocation(`/dashboard/resume-builder/${resumeId}?compiling=true`);
  };

  // Handle clicking a section in the preview to set AI editing context
  const handlePreviewSectionClick = (sectionId: string) => {
    setAiEditingComponent(sectionId);
    // In manual mode, switch to AI chat when clicking a section in preview
    if (!isAIMode) {
      setActiveSection("ai-chat");
    }
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

  const hasOriginalArtifact = Boolean(resume.originalStorageUrl);
  const canEmbedOriginalPdf = hasOriginalArtifact && resume.originalMimeType === "application/pdf";
  const effectivePreviewMode = hasOriginalArtifact ? previewMode : "template";

  // Show compiling screen if in compiling mode
  if (isCompiling) {
    return <ResumeCompiling resumeId={resumeId!} />;
  }

  // Responsive class names for better maintainability
  const sidebarClasses = [
    "w-full md:w-56 lg:w-64",             // Width: slightly wider for easier component navigation
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

  const sectionReferenceHints: Record<string, string> = {
    personal: "Verify contact details and links against your original file.",
    summary: "Mirror the strongest opening statements from your original summary.",
    experience: "Reuse quantifiable impact bullets from your original experience.",
    education: "Cross-check school names, majors, and dates.",
    skills: "Pull exact keywords and tools from your uploaded resume.",
  };

  const handleTemplateChange = (template: string) => {
    if (!resumeData) return;
    
    // Immediate save before switching to prevent data loss
    setIsSaving(true);
    saveResumeMutation.mutate({
      title: resumeTitle,
      resumeData,
      template: template,
    }, {
      onSuccess: () => {
        setSelectedTemplate(template);
      }
    });
  };

  const renderPreviewPane = () => (
    <div className="hidden lg:block lg:flex-[0_0_46%] lg:max-w-[46%] lg:min-w-[420px] border-l border-border bg-muted/30 overflow-auto p-4 xl:p-6">
      <div className="sticky top-0 space-y-3">
        {hasOriginalArtifact && (
          <div className="bg-background border border-border rounded-md p-2 flex gap-2">
            <Button variant={effectivePreviewMode === "template" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("template")}>Template Preview</Button>
            <Button variant={effectivePreviewMode === "original" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("original")}>Original Resume</Button>
            {canEmbedOriginalPdf && (
              <Button variant={effectivePreviewMode === "compare" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("compare")}>Compare Side-by-Side</Button>
            )}
          </div>
        )}

        {effectivePreviewMode === "compare" && canEmbedOriginalPdf ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background border border-border rounded-md h-[75vh] overflow-hidden">
              <iframe src={resume.originalStorageUrl || ""} className="w-full h-full" title="Original Resume" />
            </div>
            <div>
              <ResumePreview
                data={resumeData}
                template={selectedTemplate}
                onSectionClick={handlePreviewSectionClick}
                previewRef={visiblePreviewRef}
              />
            </div>
          </div>
        ) : effectivePreviewMode === "original" ? (
          <div className="bg-background border border-border rounded-md p-3">
            <p className="text-sm font-medium mb-2">Original Resume</p>
            {canEmbedOriginalPdf ? (
              <iframe src={resume.originalStorageUrl || ""} className="w-full h-[75vh] rounded border" title="Original Resume" />
            ) : (
              <div className="text-sm text-muted-foreground">
                This file type can’t be embedded in-browser. Open the original file in a new tab.
                <div className="mt-2">
                  <a href={resume.originalStorageUrl || "#"} target="_blank" rel="noreferrer" className="text-primary underline">Open Original Resume</a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ResumePreview
            data={resumeData}
            template={selectedTemplate}
            onSectionClick={handlePreviewSectionClick}
            previewRef={visiblePreviewRef}
          />
        )}
      </div>
    </div>
  );

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
                onClick={() => {
                  setAiEditingComponent(undefined);
                  setAiMode("enhancement");
                  setActiveSection("ai-chat");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-small transition-colors ${
                  activeSection === "ai-chat" && aiMode === "enhancement"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="flex-1 text-left">AI Enhancement</span>
              </button>
              
              {/* Builder AI button - show if sections exist, with completed state */}
              {resume && resume.aiBuilderComponents && Array.isArray(resume.aiBuilderComponents) && resume.aiBuilderComponents.length > 0 && (
                (() => {
                  const isCompleted = resume.aiBuilderCompleted || incompleteBuilderSections.length === 0;
                  const canUseBuilder = !isCompleted || (userPlan === "student" || userPlan === "plus" || userPlan === "ultra");
                  
                  return (
                    <button
                      onClick={() => {
                        if (!canUseBuilder) {
                          toast({
                            title: "Builder Complete",
                            description: userPlan === "free" 
                              ? "AI Builder has completed all sections. Upgrade to Student, Plus, or Ultra for additional builder sessions."
                              : "All selected sections have been filled.",
                          });
                          return;
                        }
                        setAiEditingComponent(undefined);
                        setAiMode("builder");
                        setActiveSection("ai-chat");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-small transition-colors ${
                        !canUseBuilder
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : activeSection === "ai-chat" && aiMode === "builder"
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      disabled={!canUseBuilder}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="flex-1 text-left">
                        Builder AI {isCompleted ? "(Complete)" : ""}
                      </span>
                    </button>
                  );
                })()
              )}
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
                onClick={() => {
                  setAiEditingComponent(undefined);
                  setAiMode("enhancement");
                  setActiveSection("ai-chat");
                }}
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
              <div className="flex-1 lg:flex-[0_0_54%] overflow-hidden">
              <AIResumeChat
                  resumeId={resumeId!}
                  resumeData={resumeData}
                  onUpdate={updateResumeData}
                  onSwitchToManual={handleSwitchToManual}
                  onComplete={handleAIComplete}
                  selectedComponents={selectedComponents}
                  onEditComponents={handleEditComponents}
                  onAutoSave={handleSave}
                  mode="builder"
                />
              </div>
              {/* Preview in AI mode - hidden on mobile, shown from tablet landscape and up */}
              {renderPreviewPane()}
            </>
          ) : (
            <>
              {/* Editor Section - now responsive */}
              <div className={`flex-1 lg:flex-[0_0_50%] overflow-auto ${activeSection === "ai-chat" ? "p-0" : "p-4 sm:p-6"}`}>
                {activeSection === "ai-chat" ? (
                  <AIResumeChat
                    resumeId={resumeId!}
                    resumeData={resumeData}
                    onUpdate={updateResumeData}
                    onSwitchToManual={() => setActiveSection("personal")}
                    focusedComponent={aiEditingComponent}
                    selectedComponents={aiMode === "builder" ? incompleteBuilderSections : []}
                    mode={aiMode}
                    onAutoSave={handleSave}
                  />
                ) : ActiveSectionComponent ? (
                  <>
                    {hasOriginalArtifact && (
                      <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Use original as reference</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {sectionReferenceHints[activeSection] || "Keep this section aligned with your source resume details."}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewMode(canEmbedOriginalPdf ? "compare" : "original")}
                        >
                          Open Reference
                        </Button>
                      </div>
                    )}
                    <ActiveSectionComponent
                      data={resumeData}
                      onUpdate={updateResumeData}
                    />
                  </>
                ) : null}
              </div>

              {/* Live Preview Section - responsive: hidden on mobile, shown from tablet landscape and up */}
              {renderPreviewPane()}
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
        isAIMode={isAIMode}
      />

      {/* Hidden container for PDF generation - renders the exact same template the user sees */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "816px",
          backgroundColor: "#ffffff",
        }}
        aria-hidden="true"
        role="presentation"
      >
        <div ref={printRef}>
          <ResumePreview
            data={resumeData}
            template={selectedTemplate}
          />
        </div>
      </div>
    </div>
  );
}
