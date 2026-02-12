import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, Mail, Shield, Activity, BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

export default function AdminUserDetails() {
  const [, params] = useRoute("/dashboard/admin/users/:userId");
  const userId = params?.userId;
  const [, setLocation] = useLocation();

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: ["/api/admin/users/:userId", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user details");
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch AI usage data
  const { data: aiUsageResponse, isLoading: isLoadingUsage } = useQuery({
    queryKey: ["/api/admin/users/:userId/ai-usage", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/admin/users/${userId}/ai-usage`);
      if (!res.ok) throw new Error("Failed to fetch AI usage");
      return res.json();
    },
    enabled: !!userId,
  });

  // Use real data from API, fallback to empty array if not available
  const aiUsageData = aiUsageResponse?.weeklyData || [];

  const chartConfig = {
    edits: {
      label: "AI Edits",
      color: "hsl(var(--primary))",
    },
    scans: {
      label: "ATS Scans",
      color: "hsl(210, 40%, 60%)",
    },
    letters: {
      label: "Cover Letters",
      color: "hsl(280, 40%, 60%)",
    },
  };

  if (isLoading || isLoadingUsage) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-8 text-center">Loading user details...</div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-8 text-center">User not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/dashboard/admin")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div>
          <h2 className="text-subheader font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            User Details
          </h2>
          <p className="text-muted-foreground">
            {userDetails.user.name || userDetails.user.username}
          </p>
        </div>
      </div>

      {/* User Information Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{userDetails.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="text-sm font-medium">@{userDetails.user.username}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <Badge className="capitalize">{userDetails.subscription.plan}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium">
                {userDetails.user.accountBlocked ? (
                  <Badge variant="destructive">Blocked</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {new Date(userDetails.user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Login</p>
              <p className="text-sm font-medium">
                {userDetails.user.lastLoginAt
                  ? new Date(userDetails.user.lastLoginAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Usage Graphs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Monthly Usage Overview
            </CardTitle>
            <CardDescription>AI features usage per week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={aiUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="edits" fill="var(--color-edits)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scans" fill="var(--color-scans)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="letters" fill="var(--color-letters)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Usage Trend
            </CardTitle>
            <CardDescription>AI edits over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <LineChart data={aiUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="edits" 
                  stroke="var(--color-edits)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Current Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Month Usage</CardTitle>
          <CardDescription>Feature usage statistics for this billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">AI Edits</p>
              <p className="text-2xl font-medium">{userDetails.usage.aiEditsThisMonth || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cover Letters</p>
              <p className="text-2xl font-medium">{userDetails.usage.coverLettersThisMonth || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Job Analyses</p>
              <p className="text-2xl font-medium">{userDetails.usage.jobAnalysesThisMonth || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ATS Scans</p>
              <p className="text-2xl font-medium">{userDetails.usage.atsScansThisMonth || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumes Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">{userDetails.statistics.resumeCount || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">{userDetails.statistics.aiUsageCount || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Security Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium">{userDetails.statistics.securityEventsCount || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
