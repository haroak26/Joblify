import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { User, CreditCard, BarChart3, Check, Zap, Clock, Award, TrendingUp, Download, Shield, FileText, Settings, Database, FileSpreadsheet, Calendar, Briefcase, Sparkles } from "lucide-react";
import type { Subscription, Usage } from "@shared/schema";
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
    aiEditsThisMonth: number;
    importedResumesThisMonth: number;
    jobAnalysesThisMonth: number;
    coverLettersThisMonth: number;
    atsScansThisMonth: number;
    schedulesCount: number;
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
    aiEdits: number;
    schedules: number;
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
  const [showDataSummary, setShowDataSummary] = useState(false);

  const userQuery = useQuery<UserResponse>({
    queryKey: ["/api/auth/me"],
  });

  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });

  const usageQuery = useQuery<UsageResponse>({
    queryKey: ["/api/usage"],
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

  // GDPR/CCPA Data Rights Queries
  const dataSummaryQuery = useQuery({
    queryKey: ["/api/user/data-summary"],
    enabled: showDataSummary,
  });

  const downloadDataExport = async () => {
    try {
      const response = await apiRequest("GET", "/api/user/data-export");
      const data = await response.json();
      
      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `joblify-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Data Export Complete",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadDataExportPDF = async () => {
    try {
      const response = await apiRequest("POST", "/api/user/data-export-pdf");
      const blob = await response.blob();
      
      // Create a blob and download it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `joblify-data-export-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Export Complete",
        description: "Your data has been downloaded as a PDF.",
      });
    } catch (error) {
      toast({
        title: "PDF Export Failed",
        description: "Unable to export your data as PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const maxJobs = usageData?.limits.maxJobsPerMonth ?? 0;
  const maxSkills = usageData?.limits.maxSkills ?? 0;
  const maxSchedules = usageData?.limits.maxSchedules ?? 0;

  const jobsUsedPercent = usageData && maxJobs > 0
    ? (usageData.usage.jobsScrapedThisMonth / maxJobs) * 100
    : 0;

  const skillsUsedPercent = usageData && maxSkills > 0
    ? (usageData.usage.skillsCount / maxSkills) * 100
    : 0;

  const schedulesUsedPercent = usageData && maxSchedules > 0
    ? (usageData.usage.schedulesCount / maxSchedules) * 100
    : 0;

  // Helper to get color based on usage percentage
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "destructive";
    if (percent >= 70) return "default";
    return "secondary";
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.username?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
        {/* Profile Header - Always Visible */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-background">
                  {getUserInitials()}
                </div>
                {user?.emailVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {userQuery.isLoading ? (
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold" data-testid="text-username">
                        {user?.name || user?.username}
                      </h1>
                      <Badge variant={user?.emailVerified ? "secondary" : "destructive"} className="h-6">
                        {user?.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </>
                  )}
                </div>
                
                {userQuery.isLoading ? (
                  <div className="h-5 w-64 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-muted-foreground flex items-center gap-2" data-testid="text-email">
                    <span>{user?.email}</span>
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Member since {new Date().getFullYear()}</span>
                </div>
              </div>

              {/* Current Plan Badge */}
              <div className="sm:ml-auto">
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
                  <Badge variant="outline" className="text-lg px-4 py-2 font-bold">
                    {currentPlanLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/50">
            <TabsTrigger value="usage" className="flex items-center gap-2 data-[state=active]:bg-background">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-background">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Data & Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Usage Overview</h2>
                <p className="text-muted-foreground">Monitor your monthly resource consumption</p>
              </div>
              {usageData && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <Clock className="w-4 h-4" />
                  Resets {(() => {
                    const resetDate = new Date(usageData.usage.monthResetDate);
                    const nextMonth = new Date(resetDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  })()}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Job Imports */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-blue-500/10 rounded-lg">
                        <Briefcase className="w-5 h-5 text-blue-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">Job Imports</CardTitle>
                    </div>
                    <Badge variant={getUsageColor(jobsUsedPercent)} className="font-semibold">
                      {usageData?.usage.jobsScrapedThisMonth || 0}/{maxJobs === -1 ? "∞" : maxJobs || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress 
                    value={maxJobs === -1 ? 0 : jobsUsedPercent} 
                    className="h-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {maxJobs === -1 
                      ? "Unlimited job imports available"
                      : `${usageData?.remaining.jobsThisMonth || 0} imports remaining`
                    }
                  </p>
                </CardContent>
              </Card>

              {/* AI Edits */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-purple-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">AI Edits</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {usageData?.usage.aiEditsThisMonth || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Resume improvements</p>
                    <p>• Cover letter generation</p>
                    <p>• ATS optimization</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cover Letters */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-green-500/10 rounded-lg">
                        <FileText className="w-5 h-5 text-green-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">Cover Letters</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {usageData?.usage.coverLettersThisMonth || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Cover letters generated this month
                  </p>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-amber-500/10 rounded-lg">
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">Skills</CardTitle>
                    </div>
                    <Badge variant={getUsageColor(skillsUsedPercent)} className="font-semibold">
                      {usageData?.usage.skillsCount || 0}/{maxSkills === -1 ? "∞" : maxSkills || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress 
                    value={maxSkills === -1 ? 0 : skillsUsedPercent} 
                    className="h-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {maxSkills === -1 
                      ? "Unlimited skills allowed"
                      : `${usageData?.remaining.skills || 0} skills remaining`
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Schedules */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-indigo-500/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">Schedules</CardTitle>
                    </div>
                    <Badge variant={getUsageColor(schedulesUsedPercent)} className="font-semibold">
                      {usageData?.usage.schedulesCount || 0}/{maxSchedules === -1 ? "∞" : maxSchedules || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress 
                    value={maxSchedules === -1 ? 0 : schedulesUsedPercent} 
                    className="h-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {usageData?.limits.hasScheduleAccess
                      ? maxSchedules === -1 ? "Unlimited schedules" : `${usageData?.remaining.schedules || 0} remaining`
                      : "Upgrade to access schedules"
                    }
                  </p>
                </CardContent>
              </Card>

              {/* ATS Scans */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-rose-500/10 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-rose-500" />
                      </div>
                      <CardTitle className="text-base font-semibold">ATS Scans</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {usageData?.usage.atsScansThisMonth || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Resume scans completed this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Premium Benefits Callout */}
            {(isPlus || isUltra || isLifetime) && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <CardTitle>Premium Benefits Active</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Extended usage limits</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Advanced AI features</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>All export formats</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">{/* Subscription Section */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Subscription & Billing</h2>
            <p className="text-muted-foreground">Manage your plan and billing information</p>
          </div>
          
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
                  className={`relative overflow-hidden rounded-xl border-2 p-6 transition-all hover:shadow-xl ${
                    isCurrent
                      ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          {plan.popular && !isCurrent && (
                            <Badge className="bg-primary">Popular</Badge>
                          )}
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="h-6 rounded-full border-2 border-primary/30 bg-primary/20 px-3 text-xs font-bold uppercase tracking-wider text-primary"
                            >
                              {isCancelled ? "Cancelling" : "Current"}
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
                        <li key={i} className="flex items-center gap-3 text-sm">
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
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Account Settings</h2>
              <p className="text-muted-foreground">Manage your account preferences and security</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  Additional settings will be available here, including:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Password change</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Two-factor authentication</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings className="w-4 h-4" />
                  <span>Email preferences</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings className="w-4 h-4" />
                  <span>Notification settings</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Privacy Tab */}
          <TabsContent value="data" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Data & Privacy</h2>
              <p className="text-muted-foreground">Manage your personal data and privacy settings</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your Data Rights
                </CardTitle>
                <CardDescription>
                  In accordance with GDPR and CCPA, you have the following rights regarding your personal data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PDF Data Export */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border-2 bg-muted/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" />
                      <p className="font-semibold">Download Your Data (PDF)</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Export your personal data in a readable PDF format (Right to Data Portability).
                    </p>
                  </div>
                  <Button 
                    onClick={downloadDataExportPDF}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>

                {/* JSON Data Export */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <p className="font-semibold">Download Your Data (JSON)</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Export all your data in machine-readable JSON format.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={downloadDataExport}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </div>

                {/* Data Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="font-semibold">View What Data We Collect</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      See a detailed summary of what personal data we store about you (Right to Access).
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDataSummary(!showDataSummary)}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {showDataSummary ? "Hide" : "View"} Summary
                  </Button>
                </div>

                {/* Data Summary Details */}
                {showDataSummary && dataSummaryQuery.data && (
                  <div className="mt-4 p-4 rounded-lg border bg-muted/50 space-y-4">
                    <h3 className="font-semibold text-lg">Data Categories We Collect</h3>
                    <div className="space-y-3">
                      {Object.entries(dataSummaryQuery.data.dataCategories).map(([key, category]: [string, any]) => (
                        category.dataPresent && (
                          <div key={key} className="p-3 rounded-md bg-background border">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="font-medium">{category.description}</p>
                                {category.count !== undefined && (
                                  <Badge variant="secondary" className="mt-1">
                                    {category.count} items
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Purpose:</strong> {category.purpose}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Source:</strong> {category.source}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Retention:</strong> {category.retention}
                            </p>
                          </div>
                        )
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Third-Party Data Sharing</h4>
                      <div className="space-y-2">
                        {Object.entries(dataSummaryQuery.data.thirdPartySharing).map(([key, service]: [string, any]) => (
                          <div key={key} className="p-2 rounded-md bg-background border text-sm">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-muted-foreground">Purpose: {service.purpose}</p>
                            <p className="text-muted-foreground">
                              Data shared: {service.dataShared.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">Contact for Privacy Requests</h4>
                      <p className="text-sm text-muted-foreground">
                        Email: <a href="mailto:privacy@joblifyai.com" className="text-primary hover:underline">
                          privacy@joblifyai.com
                        </a>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Response time: {dataSummaryQuery.data.contactInformation.responseTime}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6 rounded-xl border-2 border-destructive/20 bg-destructive/5">
              <div className="space-y-2">
                <p className="text-lg font-bold text-destructive flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Danger Zone
                </p>
                <p className="text-sm text-muted-foreground">Permanently remove your account and all associated data.</p>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
