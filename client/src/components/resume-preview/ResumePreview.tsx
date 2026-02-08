import { ResumeData } from "@shared/schema";
import ModernTemplate from "./ModernTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";
import AcademicTemplate from "./AcademicTemplate";
import MinimalTemplate from "./MinimalTemplate";

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
}

export default function ResumePreview({ data, template }: ResumePreviewProps) {
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
        className="mx-auto bg-white shadow-lg print:shadow-none"
        style={{
          width: '8.5in',
          minHeight: '11in',
          maxWidth: '100%',
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
}
