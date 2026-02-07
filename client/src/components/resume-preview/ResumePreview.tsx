import { ResumeData } from "@shared/schema";
import ModernTemplate from "./ModernTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
}

export default function ResumePreview({ data, template }: ResumePreviewProps) {
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
        {template === 'professional' ? (
          <ProfessionalTemplate data={data} />
        ) : (
          <ModernTemplate data={data} />
        )}
      </div>
    </div>
  );
}
