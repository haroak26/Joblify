import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Sparkles } from "lucide-react";
import type { Skill } from "@shared/schema";

const suggestedSkills = [
  "UI/UX Design",
  "Web Development",
  "React",
  "Node.js",
  "Python",
  "Graphic Design",
  "Content Writing",
  "SEO",
  "Video Editing",
  "Mobile Development",
  "WordPress",
  "Data Analysis",
];

interface SkillsManagerProps {
  skills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
}

export function SkillsManager({ skills, onSkillsChange }: SkillsManagerProps) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    
    const skill: Skill = {
      id: crypto.randomUUID(),
      name: trimmed,
    };
    onSkillsChange([...skills, skill]);
    setNewSkill("");
  };

  const removeSkill = (id: string) => {
    onSkillsChange(skills.filter((s) => s.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(newSkill);
    }
  };

  const availableSuggestions = suggestedSkills.filter(
    (s) => !skills.some((skill) => skill.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Your Skills
        </CardTitle>
        <CardDescription>
          Add your skills to find matching freelance opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill (e.g., React, UI Design)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="input-add-skill"
          />
          <Button
            onClick={() => addSkill(newSkill)}
            disabled={!newSkill.trim()}
            data-testid="button-add-skill"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="skills-list">
            {skills.map((skill) => (
              <Badge
                key={skill.id}
                variant="secondary"
                className="gap-1 pr-1"
                data-testid={`skill-badge-${skill.id}`}
              >
                {skill.name}
                <button
                  onClick={() => removeSkill(skill.id)}
                  className="ml-1 p-0.5 rounded-sm hover-elevate"
                  data-testid={`button-remove-skill-${skill.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {skills.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-skills">
            No skills added yet. Add your first skill above.
          </p>
        )}

        {availableSuggestions.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">Popular skills:</p>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.slice(0, 8).map((skill) => (
                <Button
                  key={skill}
                  variant="outline"
                  size="sm"
                  onClick={() => addSkill(skill)}
                  className="text-xs"
                  data-testid={`button-suggest-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {skill}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
