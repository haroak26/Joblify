import { useCallback } from "react";
import { ResumeData } from "@shared/schema";
import ModernTemplate from "./ModernTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";
import AcademicTemplate from "./AcademicTemplate";
import MinimalTemplate from "./MinimalTemplate";

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
  onSectionClick?: (sectionId: string) => void;
}

export default function ResumePreview({ data, template, onSectionClick }: ResumePreviewProps) {
  const handleSectionClick = useCallback((e: React.MouseEvent) => {
    if (!onSectionClick) return;
    
    // Walk up the DOM tree to find a section with data-section attribute
    let target = e.target as HTMLElement | null;
    while (target) {
      const sectionId = target.getAttribute("data-section");
      if (sectionId) {
        e.stopPropagation();
        onSectionClick(sectionId);
        return;
      }
      target = target.parentElement;
    }
  }, [onSectionClick]);

  const renderTemplate = () => {
    switch (template) {
      case "professional":
        return <ProfessionalTemplate data={data} />;
      case "academic":
        return <AcademicTemplate data={data} />;
      case "minimal":
        return <MinimalTemplate data={data} />;
      case "modern":
      default:
        return <ModernTemplate data={data} />;
    }
  };

  return (
    <div className="w-full max-w-full">
      <div 
        className={`mx-auto bg-white print:shadow-none ${onSectionClick ? 'resume-preview-clickable' : ''}`}
        style={{
          width: '8.5in',
          minHeight: '11in',
          maxWidth: '100%',
        }}
        onClick={handleSectionClick}
      >
        <style>{`
          .resume-preview-clickable [data-section] { cursor: pointer; }
          .resume-preview-clickable [data-section]:hover { outline: 2px solid hsl(var(--primary) / 0.4); outline-offset: 2px; border-radius: 2px; }
        `}</style>
        {renderTemplate()}
      </div>
    </div>
  );
}
