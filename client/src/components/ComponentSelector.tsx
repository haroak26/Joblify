import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Award, 
  FolderGit2, 
  Trophy,
  Users,
  FlaskConical,
  BookOpen
} from "lucide-react";

const DEFAULT_COMPONENTS = ["experience", "education", "skills"];

interface ComponentOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  recommended?: boolean;
}

const COMPONENT_OPTIONS: ComponentOption[] = [
  {
    id: "experience",
    label: "Work Experience",
    description: "Your professional work history and achievements",
    icon: Briefcase,
    recommended: true,
  },
  {
    id: "education",
    label: "Education",
    description: "Your academic background and qualifications",
    icon: GraduationCap,
    recommended: true,
  },
  {
    id: "skills",
    label: "Skills",
    description: "Technical and professional skills",
    icon: Sparkles,
    recommended: true,
  },
  {
    id: "certifications",
    label: "Certifications",
    description: "Professional certifications and licenses",
    icon: Award,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Personal or professional projects you've worked on",
    icon: FolderGit2,
  },
  {
    id: "awards",
    label: "Awards & Honors",
    description: "Recognition and achievements",
    icon: Trophy,
  },
  {
    id: "leadership",
    label: "Leadership",
    description: "Leadership roles and responsibilities",
    icon: Users,
  },
  {
    id: "research",
    label: "Research",
    description: "Academic or professional research work",
    icon: FlaskConical,
  },
  {
    id: "publications",
    label: "Publications",
    description: "Academic or professional publications",
    icon: BookOpen,
  },
];

interface ComponentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (components: string[]) => void;
  initialComponents?: string[];
}

export default function ComponentSelector({
  open,
  onOpenChange,
  onSelect,
  initialComponents,
}: ComponentSelectorProps) {
  const [selectedComponents, setSelectedComponents] = useState<string[]>(
    initialComponents || DEFAULT_COMPONENTS
  );

  // Update selection when dialog opens with initial components
  useEffect(() => {
    if (open && initialComponents && initialComponents.length > 0) {
      setSelectedComponents(initialComponents);
    }
  }, [open, initialComponents]);

  const handleToggle = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedComponents(COMPONENT_OPTIONS.map((opt) => opt.id));
  };

  const handleSelectRecommended = () => {
    setSelectedComponents(
      COMPONENT_OPTIONS.filter((opt) => opt.recommended).map((opt) => opt.id)
    );
  };

  const handleContinue = () => {
    onSelect(selectedComponents);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Resume Sections</DialogTitle>
          <DialogDescription>
            Select which sections you'd like to include in your resume. You can
            always add more sections later during the conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="space-y-3 py-4">
            {COMPONENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedComponents.includes(option.id);

              return (
                <div
                  key={option.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggle(option.id)}
                >
                  <Checkbox
                    id={option.id}
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <Label
                        htmlFor={option.id}
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      {option.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectRecommended}
              className="flex-1 sm:flex-initial"
            >
              Recommended
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1 sm:flex-initial"
            >
              Select All
            </Button>
          </div>
          <Button
            onClick={handleContinue}
            disabled={selectedComponents.length === 0}
            className="w-full sm:w-auto"
          >
            Continue ({selectedComponents.length} selected)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
