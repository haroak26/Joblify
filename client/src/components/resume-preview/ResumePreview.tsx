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
    <div className="w-full bg-gray-100 p-8 print:p-0 print:bg-white">
      <div 
        className="mx-auto bg-white shadow-lg print:shadow-none"
        style={{
          width: '8.5in',
          minHeight: '11in',
          aspectRatio: '8.5 / 11',
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
}
