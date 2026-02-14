import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PersonalInfoSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function PersonalInfoSection({ data, onUpdate }: PersonalInfoSectionProps) {
  const handleChange = (field: keyof ResumeData["personalInfo"], value: string) => {
    onUpdate({
      personalInfo: {
        ...data.personalInfo,
        [field]: value,
      },
    });
  };

  const handleLinkedInChange = (value: string) => {
    // Always ensure @ prefix exists and cannot be removed
    let linkedInValue = value;
    
    // If the value doesn't start with @, add it
    if (linkedInValue && !linkedInValue.startsWith('@')) {
      linkedInValue = '@' + linkedInValue;
    }
    
    // If user tries to remove @, keep it
    if (!linkedInValue || linkedInValue === '') {
      linkedInValue = '@';
    }
    
    handleChange("linkedin", linkedInValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={data.personalInfo.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={data.personalInfo.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="john.doe@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={data.personalInfo.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={data.personalInfo.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="New York, NY"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn Handle</Label>
          <Input
            id="linkedin"
            type="text"
            value={data.personalInfo.linkedin || "@"}
            onChange={(e) => handleLinkedInChange(e.target.value)}
            placeholder="@johndoe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website Domain</Label>
          <Input
            id="website"
            type="text"
            value={data.personalInfo.website || ""}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="johndoe.com"
          />
        </div>
      </div>
    </div>
  );
}
