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
    <div className="p-10 space-y-12 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-account-heading">Account Settings</h1>
        <p className="text-lg text-muted-foreground">Manage your profile, usage, and subscription.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              Account Details
            </h2>
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Username</p>
                <p className="text-lg font-semibold" data-testid="text-username">{user?.username || "Loading..."}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Address</p>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold truncate" data-testid="text-email">{user?.email || "Loading..."}</p>
                  {user?.emailVerified ? (
                    <Badge variant="secondary" className="text-xs uppercase h-6 px-3">Verified</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs uppercase h-6 px-3">Unverified</Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-8 pt-10 border-t">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-primary" />
              Subscription Plans
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isCancelled = subscription?.status === "cancelled";
                
                return (
                  <div
                    key={plan.id}
                    className={`relative border rounded-xl p-8 transition-all shadow-sm ${
                      isCurrent ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {isCurrent && (
                      <Badge variant="secondary" className="absolute -top-3 right-6 text-xs uppercase px-4 h-6">
                        {isCancelled ? "Cancelling" : "Current Plan"}
                      </Badge>
                    )}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <div className="text-right">
                          <span className="text-2xl font-bold">{plan.price}</span>
                          <span className="text-muted-foreground text-sm font-medium">/mo</span>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-3 text-base text-muted-foreground">
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {plan.id === "plus" && !isCurrent && (
                        <Button 
                          size="lg"
                          className="w-full h-12 text-base font-bold shadow-md" 
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
                            <Button variant="outline" size="lg" className="w-full h-11" data-testid="button-cancel-subscription">
                              Cancel Subscription
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold">Cancel Subscription?</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                You'll retain Plus benefits until the end of your current billing cycle.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3 mt-4">
                              <AlertDialogCancel className="h-11 px-6">Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelSubscriptionMutation.mutate()} className="bg-destructive text-destructive-foreground h-11 px-6">
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

          <section className="pt-10 border-t">
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

          <section className="pt-12 border-t">
            <div className="flex items-center justify-between gap-8 p-8 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="space-y-2">
                <p className="text-lg font-bold text-destructive">Delete Account</p>
                <p className="text-base text-muted-foreground">Permanently remove all your data, profile, and subscription.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="lg" className="px-8 h-12 font-bold" data-testid="button-delete-account">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                      This action is irreversible. All your matched jobs, AI profile, and subscription benefits will be lost forever.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3 mt-4">
                    <AlertDialogCancel className="h-11 px-6">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAccountMutation.mutate()} className="bg-destructive text-destructive-foreground h-11 px-6 font-bold">
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>

        <aside className="space-y-12">
          <div className="space-y-8 sticky top-10">
            <h3 className="text-base font-bold flex items-center gap-3 border-b pb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              Usage Tracker
            </h3>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Job Scrapes</span>
                  <span className="text-primary">{usageData?.usage.jobsScrapedThisMonth || 0}/{usageData?.limits.maxJobsPerMonth || 5}</span>
                </div>
                <Progress value={jobsUsedPercent} className="h-2 bg-muted shadow-inner" />
              </div>
              
              {!isPlus && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">Skills</span>
                    <span className="text-primary">{usageData?.usage.skillsCount || 0}/{usageData?.limits.maxSkills || 5}</span>
                  </div>
                  <Progress value={skillsUsedPercent} className="h-2 bg-muted shadow-inner" />
                </div>
              )}

              {usageData && (
                <div className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium bg-muted/30 py-2 px-4 rounded-full inline-block">
                    Resets on {new Date(new Date(usageData.usage.monthResetDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
