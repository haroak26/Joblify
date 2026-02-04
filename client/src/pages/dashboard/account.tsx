import { useEffect, useState } from "react";
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
import { User, CreditCard, BarChart3, Check, Briefcase, Zap, Clock, Award, TrendingUp } from "lucide-react";
import { ProfileSetup } from "@/components/profile-setup";
import { SkillsSkeleton } from "@/components/loading-skeleton";
import type { Skill, FreelancerProfile, Subscription, Usage } from "@shared/schema";
import { normalizePlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { clearStoredUser } from "@/lib/auth-storage";

interface SubscriptionResponse {
  subscription: Subscription;
  limits: {
    maxSkills: number;
    maxJobsPerMonth: number;
    maxSchedules: number;
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
    maxSchedules: number;
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
    billingSuffix: "",
    features: ["1 resume", "3 AI edits/mo", "5 job imports/mo", "PDF export"],
    limits: { skills: 10, jobs: 5 },
  },
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    period: "per month",
    billingSuffix: "/mo",
    features: ["5 resumes", "50 AI edits/mo", "100 job imports/mo", "PDF & DOCX", "ATS scanner", "LinkedIn import", "Cover letters"],
    limits: { skills: -1, jobs: 100 },
    popular: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$30",
    period: "per month",
    billingSuffix: "/mo",
    features: ["Unlimited resumes", "Unlimited AI edits", "Unlimited imports", "All formats", "ATS scanner", "LinkedIn import", "Cover letters", "Resume tailoring"],
    limits: { skills: -1, jobs: -1 },
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
    mutationFn: async (plan: "plus" | "ultra" | "lifetime") => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", { plan });
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
      clearStoredUser();
      queryClient.clear();
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
  const normalizedPlan = normalizePlan(subscription?.plan);
  const usageData = usageQuery.data;
  const user = userQuery.data?.user;
  const currentPlan = normalizedPlan;
  const isPlus = currentPlan === "plus";
  const isUltra = currentPlan === "ultra";
  const isLifetime = currentPlan === "lifetime";
  const visiblePlans = isLifetime ? plans.filter((plan) => plan.id === "lifetime") : plans;
  const currentPlanLabel = currentPlan === "ultra"
    ? "Ultra"
    : currentPlan === "plus"
    ? "Plus"
    : currentPlan === "lifetime"
    ? "Lifetime"
    : "Free";
  const cancellationDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  const [hasSyncedCheckout, setHasSyncedCheckout] = useState(false);

  const syncCheckoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("GET", `/api/stripe/checkout-session/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({
        title: "Subscription Updated",
        description: "Your upgrade has been applied.",
      });
    },
    onError: () => {
      toast({
        title: "Upgrade Pending",
        description: "We could not confirm your upgrade yet. Please refresh in a moment.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get("success") === "true";
    const sessionId = params.get("session_id");

    if (!hasSyncedCheckout && isSuccess && sessionId && !syncCheckoutMutation.isPending) {
      setHasSyncedCheckout(true);
      syncCheckoutMutation.mutate(sessionId);
    }
  }, [hasSyncedCheckout, syncCheckoutMutation]);

  const handleIntroChange = (intro: string) => {
    updateProfileMutation.mutate({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    updateProfileMutation.mutate({ ...profile, skills });
  };

  const maxJobs = usageData?.limits.maxJobsPerMonth ?? 0;
  const maxSkills = usageData?.limits.maxSkills ?? 0;

  const jobsUsedPercent = usageData && maxJobs > 0
    ? (usageData.usage.jobsScrapedThisMonth / maxJobs) * 100
    : 0;

  const skillsUsedPercent = usageData && maxSkills > 0
    ? (usageData.usage.skillsCount / maxSkills) * 100
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 sm:space-y-10 lg:space-y-12 max-w-5xl mx-auto">
      <div className="space-y-12 sm:space-y-16">
        {/* Account Details Section */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-3 border-b pb-4">
            <User className="w-6 h-6 text-primary" />
            Profile Information
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
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

        {/* Subscription Section */}
        <section className="space-y-8">
          <h2 className="text-xl font-semibold flex items-center gap-3 border-b pb-4">
            <CreditCard className="w-6 h-6 text-primary" />
            Subscription & Billing
          </h2>
          {subscription?.status === "cancelled" && cancellationDate && (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Your subscription will cancel on <span className="font-semibold">{cancellationDate}</span>.
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isCancelled = subscription?.status === "cancelled";
              
              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-lg border p-6 sm:p-7 transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background'
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{plan.name}</h3>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-full border border-primary/30 bg-primary/10 px-2 text-[10px] font-semibold uppercase tracking-widest text-primary"
                            >
                              {isCancelled ? "Cancelling" : "Active Plan"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">{plan.period}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        {plan.billingSuffix && (
                          <span className="text-muted-foreground text-sm font-medium">{plan.billingSuffix}</span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {(plan.id === "plus" || plan.id === "ultra" || plan.id === "lifetime") && !isCurrent && (
                      <Button 
                        size="default"
                        className="w-full font-bold"
                        onClick={() => upgradeMutation.mutate(plan.id as "plus" | "ultra" | "lifetime")}
                        disabled={upgradeMutation.isPending}
                        data-testid={`button-upgrade-${plan.id}`}
                      >
                        {upgradeMutation.isPending ? "Processing..." : `Upgrade to ${plan.name}`}
                      </Button>
                    )}
                    
                    {(plan.id === "plus" || plan.id === "ultra") && isCurrent && !isCancelled && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full" data-testid="button-cancel-subscription">
                            Cancel Subscription
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">Cancel Subscription?</AlertDialogTitle>
                            <AlertDialogDescription className="text-base">
                              You'll retain {currentPlanLabel} benefits until the end of your current billing cycle.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-3 mt-4">
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

        {/* Usage Tracker Section - Redesigned */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              Usage Overview
            </h2>
            {usageData && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <Clock className="w-3.5 h-3.5" />
                Resets {(() => {
                  const resetDate = new Date(usageData.usage.monthResetDate);
                  // Add one month properly
                  const nextMonth = new Date(resetDate);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                })()}
              </Badge>
            )}
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Job Scrapes Card */}
            <Card className="relative overflow-hidden border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-medium">Job Imports</CardTitle>
                  </div>
                  <Badge 
                    variant={jobsUsedPercent >= 90 ? "destructive" : jobsUsedPercent >= 70 ? "default" : "secondary"}
                    className="font-semibold"
                  >
                    {usageData?.usage.jobsScrapedThisMonth || 0}/{maxJobs === -1 ? "∞" : maxJobs || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress 
                  value={jobsUsedPercent} 
                  className="h-3 bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {maxJobs === -1 
                    ? "Unlimited job imports available"
                    : `${usageData?.remaining.jobsThisMonth || 0} imports remaining this month`
                  }
                </p>
              </CardContent>
            </Card>
            
            {/* Skills Card - Only show for free tier */}
            {!isPlus && !isUltra && !isLifetime && (
              <Card className="relative overflow-hidden border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-muted rounded-lg">
                        <Award className="w-5 h-5 text-foreground" />
                      </div>
                      <CardTitle className="text-base font-medium">AI Edits</CardTitle>
                    </div>
                    <Badge 
                      variant={skillsUsedPercent >= 90 ? "destructive" : skillsUsedPercent >= 70 ? "default" : "secondary"}
                      className="font-semibold"
                    >
                      {usageData?.usage.skillsCount || 0}/{maxSkills === -1 ? "∞" : maxSkills || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress 
                    value={skillsUsedPercent} 
                    className="h-3 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {usageData?.remaining.skills || 0} AI edits remaining
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Placeholder card for paid tiers to maintain grid */}
            {(isPlus || isUltra || isLifetime) && (
              <Card className="relative overflow-hidden border border-dashed border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-medium">Premium Benefits</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Unlimited AI edits</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{maxJobs === -1 ? "Unlimited" : "Extended"} job imports</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Priority support</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Work Profile Section */}
        <section className="space-y-6 pt-10 border-t">
          <h2 className="text-xl font-semibold flex items-center gap-3 border-b pb-4">
            <Briefcase className="w-6 h-6 text-primary" />
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

        {/* Danger Zone Section */}
        <section className="pt-12 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6 sm:p-8 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="space-y-2">
              <p className="text-lg font-bold text-destructive">Danger Zone</p>
              <p className="text-base text-muted-foreground">Permanently remove your account and all associated data.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="default" className="px-8 font-bold w-full sm:w-auto" data-testid="button-delete-account">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    This action is irreversible. All data will be lost forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-4">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAccountMutation.mutate()} className="bg-destructive text-destructive-foreground font-bold">
                    Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </div>
  );
}
