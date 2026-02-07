import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface SkillsSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function SkillsSection({ data, onUpdate }: SkillsSectionProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddSkill = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || data.skills.includes(trimmedValue)) return;

    onUpdate({
      skills: [...data.skills, trimmedValue],
    });
    setInputValue("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onUpdate({
      skills: data.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="skill-input">Add Skills</Label>
        <div className="flex gap-2">
          <Input
            id="skill-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., JavaScript, React, Node.js"
          />
          <Button onClick={handleAddSkill} type="button">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Press Enter or click Add to add a skill
        </p>
      </div>

      {data.skills.length > 0 && (
        <div className="space-y-2">
          <Label>Your Skills ({data.skills.length})</Label>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="ml-2 hover:text-destructive"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.skills.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No skills added yet. Add your professional skills above.</p>
        </div>
      )}
    </div>
  );
}
