import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, Briefcase, Palette, Crown, Code } from "lucide-react";
import { RESUME_TEMPLATES } from "@shared/schema";
import type { ResumeTemplateId } from "@shared/schema";

const templateIcons: Record<ResumeTemplateId, any> = {
  modern: FileText,
  professional: Briefcase,
  creative: Palette,
  executive: Crown,
  technical: Code,
};

export default function TemplateSelect() {
  const [, navigate] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId | null>(null);

  const handleSelectTemplate = (templateId: ResumeTemplateId) => {
    setSelectedTemplate(templateId);
    // Navigate to builder with selected template
    setTimeout(() => {
      navigate(`/dashboard/resumes/new?template=${templateId}`);
    }, 300);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3">Choose Your Resume Template</h1>
        <p className="text-lg text-muted-foreground">
          Select a professional template that matches your style and industry
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(RESUME_TEMPLATES).map(([id, template]) => {
          const Icon = templateIcons[id as ResumeTemplateId];
          const isSelected = selectedTemplate === id;
          
          return (
            <Card
              key={id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'
              }`}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(id as ResumeTemplateId);
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Template'}
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
