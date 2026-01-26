import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Sparkles, Wand2, RefreshCw, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import type { Skill } from "@shared/schema";

const popularSkills = [
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

interface ProfileSetupProps {
  intro: string;
  skills: Skill[];
  onIntroChange: (intro: string) => void;
  onSkillsChange: (skills: Skill[]) => void;
}

export function ProfileSetup({ intro, skills, onIntroChange, onSkillsChange }: ProfileSetupProps) {
  const [localIntro, setLocalIntro] = useState(intro);
  const [localSkills, setLocalSkills] = useState<Skill[]>(skills);
  const [newSkill, setNewSkill] = useState("");
  

  useEffect(() => {
    setLocalIntro(intro);
  }, [intro]);

  useEffect(() => {
    setLocalSkills(skills);
  }, [skills]);

  const suggestMutation = useMutation({
    mutationFn: async (introText: string) => {
      const response = await apiRequest("POST", "/api/suggest-skills", { intro: introText });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.skills && data.skills.length > 0) {
        const newSkills: Skill[] = data.skills
          .filter((name: string) => !localSkills.some(s => s.name.toLowerCase() === name.toLowerCase()))
          .map((name: string) => ({
            id: crypto.randomUUID(),
            name,
          }));
        
        if (newSkills.length > 0) {
          const updatedSkills = [...localSkills, ...newSkills];
          setLocalSkills(updatedSkills);
          onSkillsChange(updatedSkills);
        }
      }
    },
    onError: () => {
      // Error handled by UI
    },
  });

  const addSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (localSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    
    const skill: Skill = {
      id: crypto.randomUUID(),
      name: trimmed,
    };
    const updatedSkills = [...localSkills, skill];
    setLocalSkills(updatedSkills);
    onSkillsChange(updatedSkills);
    setNewSkill("");
  };

  const removeSkill = (id: string) => {
    const updatedSkills = localSkills.filter((s) => s.id !== id);
    setLocalSkills(updatedSkills);
    onSkillsChange(updatedSkills);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(newSkill);
    }
  };

  const handleSuggestSkills = () => {
    if (localIntro.length < 10) {
      return;
    }
    suggestMutation.mutate(localIntro);
  };

  const handleBlur = () => {
    if (localIntro !== intro) {
      onIntroChange(localIntro);
    }
  };

  const availableSuggestions = popularSkills.filter(
    (s) => !localSkills.some((skill) => skill.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Your Introduction
              </CardTitle>
              <CardDescription>
                Share what you do, the industries you know, and the outcomes you deliver. This powers better job matches and sharper outreach.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
              Step 1
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: I'm a frontend developer with 5 years of experience building SaaS products. I specialize in React and TypeScript and help startups ship faster. I'm looking for product-led teams that need clean UI and fast iterations."
            value={localIntro}
            onChange={(e) => setLocalIntro(e.target.value)}
            onBlur={handleBlur}
            rows={5}
            className="resize-none text-base"
            data-testid="textarea-intro"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{localIntro.length} characters</span>
              <span className="hidden sm:inline">Aim for 2-4 sentences.</span>
            </div>
            <Button
              onClick={handleSuggestSkills}
              disabled={suggestMutation.isPending || localIntro.length < 10}
              variant="secondary"
              size="lg"
              className="gap-2"
              data-testid="button-suggest-skills"
            >
              {suggestMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Suggest skills
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Your Skills
              </CardTitle>
              <CardDescription>
                Add the exact skills you want to be hired for. Joblify matches jobs to these signals first.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
              Step 2
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Add a skill (e.g., React, UI Design)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11 min-w-[220px] flex-1"
              data-testid="input-add-skill"
            />
            <Button
              onClick={() => addSkill(newSkill)}
              disabled={!newSkill.trim()}
              size="lg"
              className="h-11"
              data-testid="button-add-skill"
            >
              <Plus className="w-4 h-4" />
              Add skill
            </Button>
          </div>

          {localSkills.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="skills-list">
              {localSkills.map((skill) => (
                <Badge
                  key={skill.id}
                  variant="secondary"
                  className="gap-1.5 pr-1.5 py-1.5 text-sm"
                  data-testid={`skill-badge-${skill.id}`}
                >
                  {skill.name}
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="ml-1 p-0.5 rounded hover-elevate"
                    data-testid={`button-remove-skill-${skill.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {localSkills.length === 0 && (
            <div className="py-4 text-center border border-dashed rounded-lg" data-testid="text-no-skills">
              <Sparkles className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground px-2">
                No skills yet. Add 3-6 of your strongest ones to unlock better matches.
              </p>
            </div>
          )}

          {availableSuggestions.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Popular skills:</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.slice(0, 8).map((skill) => (
                  <Button
                    key={skill}
                    variant="secondary"
                    size="sm"
                    onClick={() => addSkill(skill)}
                    className="text-sm"
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
    </div>
  );
}
