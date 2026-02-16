import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CleanTabs, CleanTabsContent, CleanTabsList, CleanTabsTrigger } from "@/components/ui/clean-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { User, CreditCard, BarChart3, Check, Zap, Clock, Award, TrendingUp, Download, Shield, FileText, Settings, Database, FileSpreadsheet, Calendar, Briefcase, Sparkles, Eye, EyeOff, Lock, Mail, Bell, Gift, Tag, LogOut, Loader2 } from "lucide-react";
import type { Subscription, Usage } from "@shared/schema";
import { normalizePlan } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
    name?: string;
    emailVerified: boolean;
  };
}

interface TwoFAStatus {
  enabled: boolean;
}

interface UserPreferences {
  emailNotifications: boolean;
  marketingEmails: boolean;
  weeklySummaryEmails: boolean;
  inAppNotifications: boolean;
}

interface DataCategory {
  description: string;
  fields: string[];
  dataPresent: boolean;
  count?: number;
  source: string;
  purpose: string;
  retention: string;
}

interface ThirdPartyService {
  name: string;
  purpose: string;
  dataShared: string[];
  privacyPolicy: string;
}

interface ContactInformation {
  privacyEmail: string;
  dataProtectionOfficer: string;
  responseTime: string;
}

interface DataSummaryResponse {
  dataCategories: Record<string, DataCategory>;
  thirdPartySharing: Record<string, ThirdPartyService>;
  yourRights: Record<string, string>;
  contactInformation: ContactInformation;
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
    features: ["5 resumes", "50 AI edits/mo", "100 job imports/mo", "PDF & DOCX", "ATS scanner", "Cover letters"],
    limits: { skills: -1, jobs: 100 },
    popular: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$30",
    period: "per month",
    billingSuffix: "/mo",
    features: ["Unlimited resumes", "Unlimited AI edits", "Unlimited imports", "All formats", "ATS scanner", "Cover letters", "Resume tailoring"],
    limits: { skills: -1, jobs: -1 },
  },
];


export default function Account() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
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

  const billingUnavailable = () => {
    toast({
      title: "Billing unavailable",
      description: "Paid plan purchases and self-serve billing are temporarily unavailable.",
      variant: "destructive",
    });
  };

  const handleCancelSubscription = () => {
    billingUnavailable();
  };

  const handleUpgrade = (_plan: string) => {
    billingUnavailable();
  };

  const handleDowngrade = (_plan: string) => {
    billingUnavailable();
  };

  const handleManageBilling = () => {
    billingUnavailable();
  };

  const pendingUpgradePlan: string | undefined = undefined;
  const pendingDowngradePlan: string | undefined = undefined;

  // GDPR/CCPA Data Rights Queries
  const dataSummaryQuery = useQuery<DataSummaryResponse>({
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
      return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.username?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
        {/* Profile Header - Always Visible */}
        <div className="rounded-lg border bg-background p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-lg bg-primary flex items-center justify-center text-white text-header font-bold border border-primary">
                {getUserInitials()}
              </div>
              {user?.emailVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-md bg-green-500 border border-background flex items-center justify-center">
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
                    <h1 className="text-header font-bold" data-testid="text-username">
                      {user?.name || user?.username}
                    </h1>
                    <Badge variant={user?.emailVerified ? "secondary" : "destructive"} className="h-6 rounded-md">
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
              
              <div className="flex items-center gap-2 text-small text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Member since {new Date().getFullYear()}</span>
              </div>
            </div>

            {/* Current Plan Badge */}
            <div className="sm:ml-auto">
              <div className="text-right space-y-1">
                <p className="text-small text-muted-foreground uppercase tracking-wider">Current Plan</p>
                <Badge variant="outline" className="text-large px-4 py-2 font-bold rounded-md">
                  {currentPlanLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <CleanTabs defaultValue="settings" className="space-y-6">
          <CleanTabsList className="h-auto w-full gap-2 overflow-x-auto px-1 pb-2 pt-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-5 sm:gap-0 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0">
            <CleanTabsTrigger value="settings" className="flex shrink-0 snap-start items-center gap-2 border border-border/70 bg-background px-4 py-2.5 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </CleanTabsTrigger>
            <CleanTabsTrigger value="billing" className="flex shrink-0 snap-start items-center gap-2 border border-border/70 bg-background px-4 py-2.5 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
              <CreditCard className="w-4 h-4" />
              <span>Billing</span>
            </CleanTabsTrigger>
            <CleanTabsTrigger value="usage" className="flex shrink-0 snap-start items-center gap-2 border border-border/70 bg-background px-4 py-2.5 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
              <BarChart3 className="w-4 h-4" />
              <span>Usage</span>
            </CleanTabsTrigger>
            <CleanTabsTrigger value="perks" className="flex shrink-0 snap-start items-center gap-2 border border-border/70 bg-background px-4 py-2.5 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
              <Gift className="w-4 h-4" />
              <span>Perks & Codes</span>
            </CleanTabsTrigger>
            <CleanTabsTrigger value="data" className="flex shrink-0 snap-start items-center gap-2 border border-border/70 bg-background px-4 py-2.5 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
              <Database className="w-4 h-4" />
              <span>Data & Privacy</span>
            </CleanTabsTrigger>
          </CleanTabsList>

          {/* Settings Tab */}
          <CleanTabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-subheader font-bold">Account Settings</h2>
              <p className="text-muted-foreground">Manage your account preferences and security</p>
            </div>

            {/* Password Change Section */}
            <PasswordChangeSection />

            {/* Two-Factor Authentication Section */}
            <TwoFactorAuthSection />

            {/* Email Preferences Section */}
            <EmailPreferencesSection />
          </CleanTabsContent>

          {/* Billing Tab */}
          <CleanTabsContent value="billing" className="space-y-6">
            <div>
              <h2 className="text-subheader font-bold">Subscription & Billing</h2>
              <p className="text-muted-foreground">Manage your subscription plan and billing</p>
            </div>

            {/* Current Subscription */}
            <div className="border rounded-lg p-6 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Current Plan</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-2.5 py-1 font-medium">
                      {currentPlanLabel}
                    </Badge>
                    {subscription?.status && (
                      <Badge variant={subscription.status === "active" ? "outline" : "destructive"}>
                        {subscription.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isLifetime
                      ? "Lifetime access is active."
                      : "Manage billing, upgrades, and cancellations from this page."}
                  </p>
                </div>
                {subscription?.currentPeriodEnd && !isLifetime && (
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">Next renewal</p>
                    <p className="text-sm font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handleManageBilling} className="sm:w-auto">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>

                {currentPlan === "free" && (
                  <Button
                    onClick={() => handleUpgrade("plus")}
                    disabled={false}
                    className="sm:w-auto"
                  >
                    {pendingUpgradePlan === "plus" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {pendingUpgradePlan === "plus" ? "Contact support" : "Upgrade to Plus"}
                  </Button>
                )}

                {currentPlan === "plus" && (
                  <Button
                    onClick={() => handleUpgrade("ultra")}
                    disabled={false}
                  >
                    {pendingUpgradePlan === "ultra" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    {pendingUpgradePlan === "ultra" ? "Contact support" : "Upgrade to Ultra"}
                  </Button>
                )}

                {currentPlan !== "free" && !isLifetime && (
                  <Button
                    variant="outline"
                    onClick={() => handleManageBilling()}
                    disabled={false}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                )}
              </div>

              {currentPlan !== "free" && !isLifetime && (
                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until the end of the current billing period.
                          You&apos;ll be downgraded to the free plan afterwards and lose access to premium features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelSubscription()}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {/* Plan Comparison */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Plans</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan === plan.id;
                  const isPlanActionPending =
                    pendingUpgradePlan === plan.id || pendingDowngradePlan === plan.id;

                  const isDowngradeAction = currentPlan === "ultra" && plan.id === "plus";

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-lg border p-5 space-y-4 ${isCurrentPlan ? "border-primary" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-semibold">{plan.name}</h4>
                          <p className="text-2xl font-semibold mt-2">
                            {plan.price}
                            {plan.billingSuffix && (
                              <span className="text-sm font-normal text-muted-foreground">{plan.billingSuffix}</span>
                            )}
                          </p>
                        </div>
                        {plan.popular && (
                          <Badge variant="outline" className="text-xs">Popular</Badge>
                        )}
                      </div>

                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {plan.features.slice(0, 4).map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <Badge variant="secondary" className="w-full justify-center">Current Plan</Badge>
                      ) : plan.id !== "free" ? (
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={false}
                          onClick={() =>
                            isDowngradeAction ? handleDowngrade(plan.id) : handleUpgrade(plan.id)
                          }
                        >
                          {isPlanActionPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {isDowngradeAction ? "Downgrade" : "Upgrade"}
                        </Button>
                      ) : (
                        <div className="h-9" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CleanTabsContent>

          {/* Usage Tab */}
          <CleanTabsContent value="usage" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-subheader font-bold">Usage Overview</h2>
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
              {/* AI Edits - No limit tracking as limits vary by plan and are not enforced here */}
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-purple-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                      </div>
                      <h3 className="text-body font-semibold">AI Edits</h3>
                    </div>
                    <Badge variant="secondary" className="font-semibold rounded-md">
                      {usageData?.usage.aiEditsThisMonth || 0}
                    </Badge>
                  </div>
                  <div className="text-small text-muted-foreground space-y-1">
                    <p>• Resume improvements</p>
                    <p>• Cover letter generation</p>
                    <p>• ATS optimization</p>
                  </div>
                </div>
              </div>

              {/* Cover Letters */}
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-green-500/10 rounded-lg">
                        <FileText className="w-5 h-5 text-green-500" />
                      </div>
                      <h3 className="text-body font-semibold">Cover Letters</h3>
                    </div>
                    <Badge variant="secondary" className="font-semibold rounded-md">
                      {usageData?.usage.coverLettersThisMonth || 0}
                    </Badge>
                  </div>
                  <p className="text-small text-muted-foreground">
                    Cover letters generated this month
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-amber-500/10 rounded-lg">
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <h3 className="text-body font-semibold">Skills</h3>
                    </div>
                    <Badge variant={getUsageColor(skillsUsedPercent)} className="font-semibold rounded-md">
                      {usageData?.usage.skillsCount || 0}/{maxSkills === -1 ? "∞" : maxSkills || 0}
                    </Badge>
                  </div>
                  <Progress 
                    value={maxSkills === -1 ? 0 : skillsUsedPercent} 
                    className="h-2.5"
                  />
                  <p className="text-small text-muted-foreground">
                    {maxSkills === -1 
                      ? "Unlimited skills allowed"
                      : `${usageData?.remaining.skills || 0} skills remaining`
                    }
                  </p>
                </div>
              </div>

              {/* Schedules */}
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-indigo-500/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                      </div>
                      <h3 className="text-body font-semibold">Schedules</h3>
                    </div>
                    <Badge variant={getUsageColor(schedulesUsedPercent)} className="font-semibold rounded-md">
                      {usageData?.usage.schedulesCount || 0}/{maxSchedules === -1 ? "∞" : maxSchedules || 0}
                    </Badge>
                  </div>
                  <Progress 
                    value={maxSchedules === -1 ? 0 : schedulesUsedPercent} 
                    className="h-2.5"
                  />
                  <p className="text-small text-muted-foreground">
                    {usageData?.limits.hasScheduleAccess
                      ? maxSchedules === -1 ? "Unlimited schedules" : `${usageData?.remaining.schedules || 0} remaining`
                      : "Upgrade to access schedules"
                    }
                  </p>
                </div>
              </div>

              {/* ATS Scans */}
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-rose-500/10 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-rose-500" />
                      </div>
                      <h3 className="text-body font-semibold">ATS Scans</h3>
                    </div>
                    <Badge variant="secondary" className="font-semibold rounded-md">
                      {usageData?.usage.atsScansThisMonth || 0}
                    </Badge>
                  </div>
                  <p className="text-small text-muted-foreground">
                    Resume scans completed this month
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Benefits Callout */}
            {(isPlus || isUltra || isLifetime) && (
              <div className="border border-primary/20 bg-primary/5 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-large font-semibold">Premium Benefits Active</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-small">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Extended usage limits</span>
                    </div>
                    <div className="flex items-center gap-2 text-small">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-small">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Advanced AI features</span>
                    </div>
                    <div className="flex items-center gap-2 text-small">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>All export formats</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CleanTabsContent>


          {/* Data & Privacy Tab */}
          <CleanTabsContent value="data" className="space-y-6">
            <div>
              <h2 className="text-subheader font-bold">Data & Privacy</h2>
              <p className="text-muted-foreground">Manage your personal data and privacy settings</p>
            </div>

            <div className="border rounded-lg p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-large font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Your Data Rights
                  </h3>
                  <p className="text-small text-muted-foreground">
                    In accordance with GDPR and CCPA, you have the following rights regarding your personal data.
                  </p>
                </div>
                <div className="space-y-4">
                  {/* PDF Data Export */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" />
                      <p className="font-semibold">Download Your Data (PDF)</p>
                    </div>
                    <p className="text-small text-muted-foreground">
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
                    <p className="text-small text-muted-foreground">
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
                    <p className="text-small text-muted-foreground">
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
                      <h3 className="font-semibold text-large">Data Categories We Collect</h3>
                      <div className="space-y-3">
                        {Object.entries(dataSummaryQuery.data.dataCategories).map(([key, category]: [string, any]) => (
                          category.dataPresent && (
                            <div key={key} className="p-3 rounded-md bg-background border">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="font-medium">{category.description}</p>
                                  {category.count !== undefined && (
                                    <Badge variant="secondary" className="mt-1 rounded-md">
                                      {category.count} items
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-small text-muted-foreground mb-1">
                                <strong>Purpose:</strong> {category.purpose}
                              </p>
                              <p className="text-small text-muted-foreground mb-1">
                                <strong>Source:</strong> {category.source}
                              </p>
                              <p className="text-small text-muted-foreground">
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
                            <div key={key} className="p-2 rounded-md bg-background border text-small">
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
                        <p className="text-small text-muted-foreground">
                          Email: <a href="mailto:privacy@joblifyai.com" className="text-primary hover:underline">
                            privacy@joblifyai.com
                          </a>
                        </p>
                        <p className="text-small text-muted-foreground">
                          Response time: {dataSummaryQuery.data.contactInformation.responseTime}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sign Out Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6 rounded-lg border border-primary/20 bg-primary/5">
              <div className="space-y-2">
                <p className="text-large font-bold text-primary flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </p>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" size="default" className="px-8 font-bold w-full sm:w-auto">
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-large font-bold">Sign Out</AlertDialogTitle>
                    <AlertDialogDescription className="text-body">
                      Are you sure you want to sign out? You'll need to log in again to access your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3 mt-4">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      await logout();
                      navigate("/login");
                    }} className="font-bold">
                      Sign Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Danger Zone */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-2">
                <p className="text-large font-bold text-destructive flex items-center gap-2">
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
                    <AlertDialogTitle className="text-large font-bold">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-body">
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
          </CleanTabsContent>

          {/* Perks & Codes Tab */}
          <CleanTabsContent value="perks" className="space-y-6">
            <div>
              <h2 className="text-subheader font-bold">Perks & Redeemable Codes</h2>
              <p className="text-muted-foreground">Redeem codes to unlock special perks and features</p>
            </div>

            {/* Code Redemption Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-large font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Redeem a Code
                </h3>
                <p className="text-small text-muted-foreground">
                  Enter a redeemable code to unlock special perks, features, or temporary plan upgrades.
                </p>
              </div>

              <CodeRedemptionForm />
            </div>

            {/* Active Perks Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-large font-semibold flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Your Perks
                </h3>
                <p className="text-small text-muted-foreground">
                  View and manage your redeemed perks and their current status.
                </p>
              </div>

              <UserPerksList />
            </div>
          </CleanTabsContent>
        </CleanTabs>
      </div>
    </div>
  );
}

// Password Change Section Component
function PasswordChangeSection() {
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
    return Math.min(strength, 100);
  };

  const strength = passwordStrength(newPassword);
  const strengthColor = strength < 40 ? "bg-red-500" : strength < 70 ? "bg-yellow-500" : "bg-green-500";

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/change-password", {
        currentPassword,
        newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-5 h-5" />
        <h3 className="text-large font-semibold">Change Password</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Progress value={strength} className="h-2 flex-1" />
                <span className="text-small text-muted-foreground w-16">
                  {strength < 40 ? "Weak" : strength < 70 ? "Medium" : "Strong"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={changePasswordMutation.isPending}>
          {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}

// Two-Factor Authentication Section Component
function TwoFactorAuthSection() {
  const { toast } = useToast();
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const { data: twoFAStatus, refetch: refetchStatus } = useQuery<TwoFAStatus>({
    queryKey: ["/api/user/2fa/status"],
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/2fa/enable");
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      toast({
        title: "Success",
        description: "2FA enabled successfully. You will receive a verification code via email when you log in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/2fa/disable", { password: disablePassword });
      return response.json();
    },
    onSuccess: () => {
      setShowDisable(false);
      setDisablePassword("");
      refetchStatus();
      toast({
        title: "Success",
        description: "2FA disabled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <h3 className="text-large font-semibold">Two-Factor Authentication</h3>
        </div>
        {twoFAStatus?.enabled && (
          <Badge variant="outline" className="bg-green-600/10 text-green-800 dark:text-green-400 border-green-600/20">
            <Check className="w-3 h-3 mr-1" />
            Enabled
          </Badge>
        )}
      </div>
      <p className="text-small text-muted-foreground mb-4">
        Add an extra layer of security to your account with email-based verification codes
      </p>

      {!twoFAStatus?.enabled && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-small font-medium mb-2">How it works:</p>
            <ul className="text-small text-muted-foreground space-y-1 list-disc list-inside">
              <li>When you log in, a 6-digit code will be sent to your email</li>
              <li>Enter the code to complete your login</li>
              <li>Codes expire after 5 minutes</li>
            </ul>
          </div>
          <Button onClick={() => enableMutation.mutate()} disabled={enableMutation.isPending}>
            {enableMutation.isPending ? "Enabling..." : "Enable 2FA"}
          </Button>
        </div>
      )}

      {twoFAStatus?.enabled && !showDisable && (
        <Button variant="outline" onClick={() => setShowDisable(true)}>
          Disable 2FA
        </Button>
      )}

      {showDisable && (
        <div className="space-y-4 mt-4 border rounded-lg p-4 bg-muted/50">
          <p className="text-small font-medium">Enter your password to disable 2FA:</p>
          <Input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Password"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending || !disablePassword}
            >
              {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
            <Button variant="outline" onClick={() => setShowDisable(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Email Preferences Section Component
function EmailPreferencesSection() {
  const { toast } = useToast();

  const { data: preferences, refetch } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      const response = await apiRequest("POST", "/api/user/preferences", updates);
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Email preferences updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5" />
        <h3 className="text-large font-semibold">Email Preferences</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">Notification Emails</p>
            <p className="text-small text-muted-foreground">Receive emails about important account activities</p>
          </div>
          <Switch
            checked={preferences?.emailNotifications ?? true}
            onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
          />
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">Marketing Emails</p>
            <p className="text-small text-muted-foreground">Receive updates about new features and promotions</p>
          </div>
          <Switch
            checked={preferences?.marketingEmails ?? true}
            onCheckedChange={(checked) => handleToggle("marketingEmails", checked)}
          />
        </div>
      </div>
    </div>
  );
}

// Code Redemption Form Component
function CodeRedemptionForm() {
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/codes/redeem", { code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to redeem code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      setCode("");
      // Refresh the perks list
      queryClient.invalidateQueries({ queryKey: ["/api/codes/user-perks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      redeemMutation.mutate(code.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter your code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          className="flex-1 font-mono"
          maxLength={50}
        />
        <Button 
          type="submit" 
          disabled={!code.trim() || redeemMutation.isPending}
        >
          {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
        </Button>
      </div>
      <p className="text-small text-muted-foreground">
        Codes are case-insensitive. Get codes from promotional emails, social media, or special events.
      </p>
    </form>
  );
}

// User Perks List Component
function UserPerksList() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/codes/user-perks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/codes/user-perks");
      if (!response.ok) throw new Error("Failed to fetch perks");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const perks = data?.perks || [];

  if (perks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-large font-semibold">No perks redeemed yet</p>
        <p className="text-small mt-1">Redeem a code above to unlock special perks!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {perks.map((perk: any) => {
        const isExpired = perk.expiresAt && new Date(perk.expiresAt) < new Date();
        const isActive = perk.isActive && !isExpired;

        return (
          <div 
            key={perk.id} 
            className={`border rounded-lg p-4 ${isActive ? 'bg-green-50/50 border-green-200' : 'bg-muted/50'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{perk.perkName}</h4>
                  {isActive && (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  )}
                  {isExpired && (
                    <Badge variant="secondary">Expired</Badge>
                  )}
                  {!perk.isActive && !isExpired && (
                    <Badge variant="secondary">Used</Badge>
                  )}
                </div>
                <p className="text-small text-muted-foreground">{perk.perkDescription}</p>
                
                {/* Show remaining value for credit-based perks */}
                {perk.remainingValue !== null && perk.remainingValue !== undefined && (
                  <p className="text-small font-medium text-primary">
                    Remaining: {perk.remainingValue}
                  </p>
                )}
                
                <div className="flex gap-4 text-small text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Code: {perk.code}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Redeemed: {new Date(perk.redeemedAt).toLocaleDateString()}
                  </span>
                  {perk.expiresAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expires: {new Date(perk.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
