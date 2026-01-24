import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Sparkles, Wand2, RefreshCw, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const [newSkill, setNewSkill] = useState("");
  const { toast } = useToast();

  const suggestMutation = useMutation({
    mutationFn: async (introText: string) => {
      const response = await apiRequest("POST", "/api/suggest-skills", { intro: introText });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.skills && data.skills.length > 0) {
        const newSkills: Skill[] = data.skills
          .filter((name: string) => !skills.some(s => s.name.toLowerCase() === name.toLowerCase()))
          .map((name: string) => ({
            id: crypto.randomUUID(),
            name,
          }));
        
        if (newSkills.length > 0) {
          onSkillsChange([...skills, ...newSkills]);
          toast({
            title: "Skills Suggested",
            description: `Added ${newSkills.length} skills based on your intro.`,
          });
        } else {
          toast({
            title: "No New Skills",
            description: "All suggested skills are already in your list.",
          });
        }
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to suggest skills. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const handleSuggestSkills = () => {
    if (intro.length < 10) {
      toast({
        title: "More Info Needed",
        description: "Please write at least 10 characters about yourself.",
        variant: "destructive",
      });
      return;
    }
    suggestMutation.mutate(intro);
  };

  const availableSuggestions = popularSkills.filter(
    (s) => !skills.some((skill) => skill.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Your Introduction
          </CardTitle>
          <CardDescription>
            Tell us about yourself, your experience, and what you're looking for. This helps generate better job matches and personalized messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: I'm a frontend developer with 5 years of experience building web applications. I specialize in React and TypeScript, and I've worked with startups and enterprise clients. I'm looking for interesting projects where I can make a real impact..."
            value={intro}
            onChange={(e) => onIntroChange(e.target.value)}
            rows={5}
            className="resize-none text-base"
            data-testid="textarea-intro"
          />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {intro.length} characters
            </p>
            <Button
              onClick={handleSuggestSkills}
              disabled={suggestMutation.isPending || intro.length < 10}
              variant="outline"
              className="gap-2"
              data-testid="button-suggest-skills"
            >
              {suggestMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Suggest Skills with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Skills
          </CardTitle>
          <CardDescription>
            Add your skills to find matching freelance opportunities. The more skills you add, the more jobs you'll see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill (e.g., React, UI Design)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-base"
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

          {skills.length === 0 && (
            <div className="py-6 text-center border border-dashed rounded-lg" data-testid="text-no-skills">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No skills added yet. Add your first skill above or use AI to suggest skills.
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
                    variant="outline"
                    size="sm"
                    onClick={() => addSkill(skill)}
                    className="text-sm rounded-lg"
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
