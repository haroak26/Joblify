import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, CreditCard, Sparkles, Check, Crown } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, FreelancerProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 job scans per day", "Basic AI messages", "1 schedule"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    features: ["Unlimited job scans", "Advanced AI messages", "Unlimited schedules", "Priority support", "Real-time alerts"],
    current: false,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49",
    period: "per month",
    features: ["Everything in Pro", "Team collaboration", "API access", "Custom integrations", "Dedicated support"],
    current: false,
  },
];

export default function Account() {
  const { toast } = useToast();
  const [currentPlan] = useState("free");

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

  const handleUpgrade = (planId: string) => {
    toast({
      title: "Upgrade coming soon",
      description: "Subscription management will be available soon.",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-account-heading">Account</h1>
        <p className="text-muted-foreground">Manage your profile, subscription, and preferences</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscription
          </CardTitle>
          <CardDescription>Choose the plan that best fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border rounded-lg p-4 ${
                  plan.current ? 'border-primary bg-primary/5' : 'border-border'
                } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {plan.current && (
                  <Badge variant="secondary" className="absolute -top-2 right-2">
                    Current
                  </Badge>
                )}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.id === "enterprise" && <Crown className="w-4 h-4 text-primary" />}
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.current ? "outline" : "default"}
                    className="w-full"
                    disabled={plan.current}
                    onClick={() => handleUpgrade(plan.id)}
                    data-testid={`button-upgrade-${plan.id}`}
                  >
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
