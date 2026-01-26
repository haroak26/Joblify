import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, CreditCard, BarChart3, Check, Crown, Trash2, Loader2 } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, FreelancerProfile, Subscription, Usage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SubscriptionResponse {
  subscription: Subscription;
  limits: {
    maxSkills: number;
    maxJobsPerMonth: number;
    hasScheduleAccess: boolean;
  };
}

interface UsageResponse {
  usage: {
    skillsCount: number;
    jobsScrapedThisMonth: number;
    monthResetDate: string;
  };
  limits: {
    maxSkills: number;
    maxJobsPerMonth: number;
    hasScheduleAccess: boolean;
  };
  remaining: {
    skills: number;
    jobsThisMonth: number;
  };
}

interface UserResponse {
  user: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
  };
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 skills maximum", "5 job scrapes per month", "Basic AI messages"],
    limits: { skills: 5, jobs: 5 },
  },
  {
    id: "plus",
    name: "Plus",
    price: "$19",
    period: "per month",
    features: ["Unlimited skills", "300 job scrapes per month", "Advanced AI messages", "Schedule access", "Priority support"],
    limits: { skills: -1, jobs: 300 },
    popular: true,
  },
];

export default function Account() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const userQuery = useQuery<UserResponse>({
    queryKey: ["/api/auth/me"],
  });

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });

  const usageQuery = useQuery<UsageResponse>({
    queryKey: ["/api/usage"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: Partial<FreelancerProfile>) => {
      const response = await apiRequest("POST", "/api/profile", profile);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    },
    onError: (error: any) => {
      if (error.code === "SKILLS_LIMIT") {
        toast({
          title: "Skills Limit Reached",
          description: error.message || "Upgrade to Plus for unlimited skills.",
          variant: "destructive",
        });
      }
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Upgrade Failed",
        description: "Unable to start the upgrade process. Stripe may not be configured.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/cancel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the current billing period.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/account");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Unable to delete your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const profile = profileQuery.data ?? { intro: "", skills: [] };
  const subscription = subscriptionQuery.data?.subscription;
  const usageData = usageQuery.data;
  const user = userQuery.data?.user;
  const currentPlan = subscription?.plan || "free";
  const isPlus = currentPlan === "plus";

  const handleIntroChange = (intro: string) => {
    updateProfileMutation.mutate({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    updateProfileMutation.mutate({ ...profile, skills });
  };

  const jobsUsedPercent = usageData 
    ? (usageData.usage.jobsScrapedThisMonth / usageData.limits.maxJobsPerMonth) * 100
    : 0;

  const skillsUsedPercent = usageData && usageData.limits.maxSkills > 0
    ? (usageData.usage.skillsCount / usageData.limits.maxSkills) * 100
    : 0;

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-account-heading">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, usage, and subscription.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Details
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</p>
                <p className="text-base font-medium" data-testid="text-username">{user?.username || "Loading..."}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium truncate" data-testid="text-email">{user?.email || "Loading..."}</p>
                  {user?.emailVerified ? (
                    <Badge variant="secondary" className="text-[10px] uppercase h-5">Verified</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] uppercase h-5">Unverified</Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-6 border-t">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription Plans
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isCancelled = subscription?.status === "cancelled";
                
                return (
                  <div
                    key={plan.id}
                    className={`relative border rounded-lg p-5 transition-all ${
                      isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {isCurrent && (
                      <Badge variant="secondary" className="absolute -top-2 right-4 text-[10px] uppercase">
                        {isCancelled ? "Cancelling" : "Active Plan"}
                      </Badge>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold">{plan.name}</h3>
                        <div className="text-right">
                          <span className="text-xl font-bold">{plan.price}</span>
                          <span className="text-muted-foreground text-xs">/mo</span>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-3.5 h-3.5 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {plan.id === "plus" && !isCurrent && (
                        <Button 
                          className="w-full" 
                          onClick={() => upgradeMutation.mutate()}
                          disabled={upgradeMutation.isPending}
                          data-testid="button-upgrade-plus"
                        >
                          {upgradeMutation.isPending ? "Processing..." : "Upgrade to Plus"}
                        </Button>
                      )}
                      
                      {plan.id === "plus" && isCurrent && !isCancelled && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full" data-testid="button-cancel-subscription">
                              Cancel Subscription
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Plus?</AlertDialogTitle>
                              <AlertDialogDescription>
                                You'll keep Plus benefits until the end of your billing cycle.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelSubscriptionMutation.mutate()} className="bg-destructive text-destructive-foreground">
                                Confirm Cancellation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pt-6 border-t">
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
          </section>

          <section className="pt-10 border-t">
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently remove all your data and subscription.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" data-testid="button-delete-account">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action is irreversible.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAccountMutation.mutate()} className="bg-destructive text-destructive-foreground">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Usage Snapshot
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Job Scrapes</span>
                  <span>{usageData?.usage.jobsScrapedThisMonth || 0}/{usageData?.limits.maxJobsPerMonth || 5}</span>
                </div>
                <Progress value={jobsUsedPercent} className="h-1.5" />
              </div>
              
              {!isPlus && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Skills</span>
                    <span>{usageData?.usage.skillsCount || 0}/{usageData?.limits.maxSkills || 5}</span>
                  </div>
                  <Progress value={skillsUsedPercent} className="h-1.5" />
                </div>
              )}

              {usageData && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Resets on {new Date(new Date(usageData.usage.monthResetDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
