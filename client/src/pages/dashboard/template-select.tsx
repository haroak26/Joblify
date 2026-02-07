import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, Briefcase, Palette, Crown, Code } from "lucide-react";
import { RESUME_TEMPLATES, createEmptyResumeData } from "@shared/schema";
import type { ResumeTemplateId } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const templateIcons: Record<ResumeTemplateId, any> = {
  modern: FileText,
  professional: Briefcase,
  creative: Palette,
  executive: Crown,
  technical: Code,
};

export default function TemplateSelect() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId | null>(null);

  const createResumeMutation = useMutation({
    mutationFn: async (templateId: ResumeTemplateId) => {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `New ${RESUME_TEMPLATES[templateId].name} Resume`,
          template: templateId,
          resumeData: createEmptyResumeData(),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create resume");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      navigate(`/dashboard/resumes/${data.resume.id}/edit`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Reset selection after a brief delay to provide clear feedback
      setTimeout(() => {
        setSelectedTemplate(null);
      }, 2000);
    },
  });

  const handleSelectTemplate = (templateId: ResumeTemplateId) => {
    setSelectedTemplate(templateId);
    // Create empty resume and navigate to editor directly
    createResumeMutation.mutate(templateId);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3">Choose Your Resume Template</h1>
        <p className="text-lg text-muted-foreground">
          Select a professional template to start building your resume
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(RESUME_TEMPLATES).map(([id, template]) => {
          const Icon = templateIcons[id as ResumeTemplateId];
          const isSelected = selectedTemplate === id;
          const isCreating = isSelected && createResumeMutation.isPending;
          
          return (
            <Card
              key={id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'
              } ${isCreating ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={() => handleSelectTemplate(id as ResumeTemplateId)}
            >
              {/* Template Preview Placeholder */}
              <div className="aspect-[8.5/11] bg-muted rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                <Icon className="w-16 h-16 text-muted-foreground/30" />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  disabled={createResumeMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(id as ResumeTemplateId);
                  }}
                >
                  {isCreating ? 'Creating...' : isSelected ? 'Selected' : 'Select Template'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/resumes')}
        >
          Back to Resumes
        </Button>
      </div>
    </div>
  );
}
