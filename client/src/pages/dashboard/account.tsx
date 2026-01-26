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
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 border-b border-sidebar-border/30 pb-8">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-account-heading">Account & Settings</h1>
        <p className="text-muted-foreground text-base">Manage your personal information, track usage, and control your subscription.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              Personal Profile
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Username</label>
                <div className="bg-sidebar-accent/30 rounded-2xl p-4 border border-sidebar-border/50 text-lg font-semibold" data-testid="text-username">
                  {user?.username || "..."}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Email Address</label>
                <div className="bg-sidebar-accent/30 rounded-2xl p-4 border border-sidebar-border/50 flex items-center justify-between" data-testid="text-email">
                  <span className="text-lg font-semibold truncate mr-2">{user?.email || "..."}</span>
                  {user?.emailVerified ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] font-bold">VERIFIED</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] font-bold">UNVERIFIED</Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              Work Profile
            </h2>
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

          <section className="space-y-6 border-t border-sidebar-border/30 pt-12">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              System Control
            </h2>
            <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <p className="font-bold text-foreground mb-1">Permanently Delete Account</p>
                <p className="text-sm text-muted-foreground max-w-md">Once deleted, all your data, jobs, and subscription details will be removed forever.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="h-12 px-8 rounded-full font-bold" data-testid="button-delete-account">
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-sidebar-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold">Are you certain?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                      This action is irreversible. All your matched jobs, AI-ready profile, and subscription benefits will be lost immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-full h-11 px-6 font-bold">Keep Account</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      className="rounded-full h-11 px-6 font-bold bg-red-600"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Confirm Deletion"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <div className="bg-foreground text-background rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Current Plan</span>
                <Badge variant="secondary" className="bg-background text-foreground border-none font-bold px-3 py-1">{currentPlan.toUpperCase()}</Badge>
              </div>
              
              {isPlus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Crown className="w-6 h-6" />
                    <span className="text-xl font-bold">Plus Member</span>
                  </div>
                  <p className="text-sm opacity-70">You have full access to high-frequency scraping and unlimited skills.</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full h-11 rounded-full font-bold border-background/20 hover:bg-background/10 hover:text-background" data-testid="button-cancel-subscription">
                        Manage Plan
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-sidebar-border/50">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-center">Manage Plus Subscription</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-center">
                          If you cancel, you'll retain Plus benefits until your current period ends.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-4">
                        <AlertDialogCancel className="rounded-full h-11 font-bold m-0">Stay Plus</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelSubscriptionMutation.mutate()}
                          className="rounded-full h-11 font-bold bg-red-600 m-0"
                        >
                          {cancelSubscriptionMutation.isPending ? "..." : "Cancel"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Go Plus</h3>
                  <p className="text-sm opacity-70">Unlock 300+ scrapes, unlimited skills, and automated job schedules.</p>
                  <Button 
                    className="w-full h-11 rounded-full font-bold bg-primary text-primary-foreground hover:scale-[1.02] transition-transform" 
                    onClick={() => upgradeMutation.mutate()}
                    disabled={upgradeMutation.isPending}
                    data-testid="button-upgrade-plus"
                  >
                    {upgradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade for $19"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-sidebar-accent/30 border border-sidebar-border/50 rounded-3xl p-8 space-y-8 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Usage Stats
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  <span>Job Scrapes</span>
                  <span>{usageData?.usage.jobsScrapedThisMonth || 0} / {usageData?.limits.maxJobsPerMonth || 5}</span>
                </div>
                <Progress value={jobsUsedPercent} className="h-1.5 bg-sidebar-accent" data-testid="progress-jobs" />
              </div>
              
              {!isPlus && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                    <span>Skills Used</span>
                    <span>{usageData?.usage.skillsCount || 0} / {usageData?.limits.maxSkills || 5}</span>
                  </div>
                  <Progress value={skillsUsedPercent} className="h-1.5 bg-sidebar-accent" data-testid="progress-skills" />
                </div>
              )}

              {usageData && (
                <p className="text-[11px] text-muted-foreground/60 text-center font-medium">
                  Next reset: {new Date(new Date(usageData.usage.monthResetDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

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
