import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Personal Introduction</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Describe your expertise and what makes you unique. This helps our AI personalize your outreach messages for every job.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-1 font-bold bg-sidebar-accent/50">
            Phase 1
          </Badge>
        </div>
        <div className="relative">
          <Textarea
            placeholder="Example: I'm a senior frontend engineer with a focus on high-performance React applications and motion design. I've spent the last 4 years helping early-stage SaaS companies build their core products from scratch..."
            value={localIntro}
            onChange={(e) => setLocalIntro(e.target.value)}
            onBlur={handleBlur}
            rows={6}
            className="resize-none text-base bg-muted/30 border-sidebar-border/50 rounded-2xl p-6 focus-visible:ring-1 transition-all"
            data-testid="textarea-intro"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${localIntro.length > 50 ? 'bg-green-500' : 'bg-orange-500'}`} />
                {localIntro.length} characters
              </span>
              <span className="hidden sm:inline opacity-60">Write 2-3 detailed sentences for best results</span>
            </div>
            <Button
              onClick={handleSuggestSkills}
              disabled={suggestMutation.isPending || localIntro.length < 10}
              variant="outline"
              className="gap-2 rounded-full h-11 px-6 font-bold hover:bg-foreground hover:text-background transition-colors"
              data-testid="button-suggest-skills"
            >
              {suggestMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Analysis
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Core Competencies</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Your skills are used to match you with the right opportunities. Add both hard and soft skills.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-1 font-bold bg-sidebar-accent/50">
            Phase 2
          </Badge>
        </div>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="e.g. Next.js, Product Management, Figma"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 text-base px-5 bg-muted/30 border-sidebar-border/50 rounded-2xl flex-1 min-w-[300px]"
              data-testid="input-add-skill"
            />
            <Button
              onClick={() => addSkill(newSkill)}
              disabled={!newSkill.trim()}
              size="lg"
              className="h-12 px-8 rounded-2xl font-bold"
              data-testid="button-add-skill"
            >
              Add Skill
            </Button>
          </div>

          <div className="min-h-[120px] p-8 rounded-3xl border border-dashed border-sidebar-border/50 bg-sidebar-accent/5 flex flex-wrap gap-3 content-start">
            {localSkills.length > 0 ? (
              localSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center gap-2 px-4 py-2 bg-background border border-sidebar-border/50 rounded-full text-sm font-semibold shadow-sm group hover:border-primary/50 transition-colors"
                  data-testid={`skill-badge-${skill.id}`}
                >
                  {skill.name}
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-remove-skill-${skill.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-6 text-muted-foreground/40" data-testid="text-no-skills">
                <Sparkles className="w-10 h-10 mb-3" />
                <p className="text-sm font-medium">Add your first skill to begin matching</p>
              </div>
            )}
          </div>

          {availableSuggestions.length > 0 && (
            <div className="pt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Trending Skills</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.slice(0, 10).map((skill) => (
                  <Button
                    key={skill}
                    variant="ghost"
                    size="sm"
                    onClick={() => addSkill(skill)}
                    className="rounded-full px-4 h-8 bg-muted/40 hover:bg-muted font-medium text-xs transition-colors"
                    data-testid={`button-suggest-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Plus className="w-3 h-3 mr-1.5 opacity-50" />
                    {skill}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
