import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Settings
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeSection, setActiveSection] = useState<string>("personal");
  const [resumeTitle, setResumeTitle] = useState<string>("Untitled Resume");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern");

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

  // Save resume mutation
  const saveResumeMutation = useMutation({
    mutationFn: async (data: Partial<Resume>) => {
      const response = await apiRequest("PATCH", `/api/resumes/${resumeId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}`] });
      toast({
        title: "Resume saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!resumeData) return;
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Secondary Sidebar - Resume Sections */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-small font-semibold text-foreground">Resume Sections</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-small transition-colors ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            {isEditingTitle ? (
              <Input
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingTitle(false);
                }}
                className="max-w-xs h-8"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-body font-semibold hover:text-primary transition-colors"
              >
                {resumeTitle}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "AI Chat",
                  description: "AI chat feature coming soon!",
                });
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Chat
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Section */}
          <div className="flex-1 overflow-auto p-6">
            {ActiveSectionComponent && (
              <ActiveSectionComponent
                data={resumeData}
                onUpdate={updateResumeData}
              />
            )}
          </div>

          {/* Live Preview Section */}
          <div className="w-[600px] border-l border-border bg-muted/30 overflow-auto p-6">
            <div className="sticky top-0">
              <ResumePreview
                data={resumeData}
                template={selectedTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
