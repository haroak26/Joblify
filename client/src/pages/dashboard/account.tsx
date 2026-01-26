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
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-account-heading">Account</h1>
            <p className="text-muted-foreground">Manage profile settings, usage, and subscription details</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account overview
            </CardTitle>
            <CardDescription>Everything tied to your Joblify profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Username</p>
                <p className="mt-2 text-lg font-semibold" data-testid="text-username">{user?.username || "Loading..."}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-lg font-semibold truncate" data-testid="text-email">{user?.email || "Loading..."}</p>
                  {user?.emailVerified ? (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Verified</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">Not Verified</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
                  <p className="mt-2 text-lg font-semibold capitalize">{currentPlan}</p>
                </div>
                <Badge variant={isPlus ? "default" : "secondary"} className="text-xs uppercase tracking-wide">
                  {isPlus ? "Plus" : "Free"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Upgrade anytime to unlock more jobs, unlimited skills, and scheduling.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Usage snapshot
            </CardTitle>
            <CardDescription>
              {usageData && (
                <span>Resets on {new Date(new Date(usageData.usage.monthResetDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Job Scrapes</span>
                <span className="text-muted-foreground">
                  {usageData?.usage.jobsScrapedThisMonth || 0} / {usageData?.limits.maxJobsPerMonth || 5}
                </span>
              </div>
              <Progress value={jobsUsedPercent} className="h-2" data-testid="progress-jobs" />
            </div>
            
            {!isPlus && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Skills</span>
                  <span className="text-muted-foreground">
                    {usageData?.usage.skillsCount || 0} / {usageData?.limits.maxSkills || 5}
                  </span>
                </div>
                <Progress value={skillsUsedPercent} className="h-2" data-testid="progress-skills" />
              </div>
            )}

            {isPlus && (
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Unlimited skills included in Plus.</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Schedule Access</span>
              {usageData?.limits.hasScheduleAccess ? (
                <Badge variant="secondary">Enabled</Badge>
              ) : (
                <Badge variant="outline">Plus Only</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscription
          </CardTitle>
          <CardDescription>Choose the plan that best fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isCancelled = subscription?.status === "cancelled";
              
              return (
                <div
                  key={plan.id}
                  className={`relative border rounded-xl p-5 shadow-sm transition-all ${
                    isCurrent ? 'border-primary/60 bg-primary/5' : 'border-border/70 hover:border-primary/40'
                  } ${plan.popular && !isCurrent ? 'ring-2 ring-primary/40' : ''}`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.popular && !isCurrent && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="absolute -top-2 right-2">
                      {isCancelled ? "Cancelling" : "Current"}
                    </Badge>
                  )}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      {plan.id === "plus" && <Crown className="w-4 h-4 text-primary" />}
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
                    
                    {plan.id === "free" && isCurrent && (
                      <Button variant="outline" className="w-full" disabled data-testid="button-current-free">
                        Current Plan
                      </Button>
                    )}
                    
                    {plan.id === "plus" && !isCurrent && (
                      <Button 
                        className="w-full" 
                        onClick={() => upgradeMutation.mutate()}
                        disabled={upgradeMutation.isPending}
                        data-testid="button-upgrade-plus"
                      >
                        {upgradeMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          "Upgrade to Plus"
                        )}
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
                            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your subscription will remain active until the end of the current billing period. 
                              After that, you'll be downgraded to the free plan with limited features.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelSubscriptionMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    {plan.id === "plus" && isCurrent && isCancelled && (
                      <Button 
                        className="w-full" 
                        onClick={() => upgradeMutation.mutate()}
                        disabled={upgradeMutation.isPending}
                        data-testid="button-resubscribe"
                      >
                        Resubscribe
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
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

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. All your data, including your profile, 
            saved jobs, and subscription will be permanently deleted. If you have an active Plus subscription, 
            it will be automatically cancelled.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-account">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccountMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
