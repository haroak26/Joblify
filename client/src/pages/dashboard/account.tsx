import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Sparkles } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Account() {
  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: Partial<FreelancerProfile>) => {
      const response = await apiRequest("POST", "/api/profile", profile);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };

  const handleIntroChange = (intro: string) => {
    updateProfileMutation.mutate({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    updateProfileMutation.mutate({ ...profile, skills });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-account-heading">Account</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Introduction</p>
              <p className="text-sm" data-testid="text-intro-status">
                {profile.intro ? `${profile.intro.length} characters` : "Not set"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Skills</p>
              <p className="text-sm" data-testid="text-skills-count">
                {profile.skills.length} skills added
              </p>
            </div>
          </div>
          {profile.skills.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Current Skills:</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill.id} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {profileQuery.isLoading ? (
        <SkillsSkeleton />
      ) : (
        <ProfileSetup
          intro={profile.intro}
          skills={profile.skills}
          onIntroChange={handleIntroChange}
          onSkillsChange={handleSkillsChange}
        />
      )}
    </div>
  );
}
