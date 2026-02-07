import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SummarySectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function SummarySection({ data, onUpdate }: SummarySectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="summary">Professional Summary</Label>
      <Textarea
        id="summary"
        value={data.summary}
        onChange={(e) => onUpdate({ summary: e.target.value })}
        placeholder="Write a brief professional summary highlighting your key skills and experience..."
        rows={6}
        className="resize-none"
      />
      <p className="text-sm text-muted-foreground">
        {(data.summary || "").length} characters
      </p>
    </div>
  );
}
