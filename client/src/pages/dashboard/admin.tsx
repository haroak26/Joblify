import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShieldAlert, UserCheck, Sparkles, BarChart3, TrendingUp } from "lucide-react";
import { AdminUserManagement } from "./admin-user-management";
import { AdminPerksManagement } from "./admin-perks-management";
import { AdminAuditLogs } from "./admin-audit-logs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

interface DashboardStatsResponse {
  totalUsers: number;
  stats: {
    usersToday: number;
    activeUsers: number;
    blockedAccounts: number;
  };
  aiUsageByDay: Array<{ name: string; usage: number; date: string }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const chartConfig = {
    usage: {
      label: "AI Usage",
      color: "hsl(var(--primary))",
    },
  };

  const totalWeeklyUsage = useMemo(
    () => stats?.aiUsageByDay?.reduce((total, day) => total + day.usage, 0) ?? 0,
    [stats?.aiUsageByDay],
  );

  if (isLoading) {
    return <div className="py-10 text-muted-foreground">Loading admin analytics...</div>;
  }

  const usageData = stats?.aiUsageByDay ?? [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform health, control user access, and manage perks from one place.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalUsers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">Registered accounts</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Today</CardDescription>
            <CardTitle className="text-3xl">{stats?.stats.usersToday ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm">Fresh signups today</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active in 7 Days</CardDescription>
            <CardTitle className="text-3xl">{stats?.stats.activeUsers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Recently engaged users</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked Accounts</CardDescription>
            <CardTitle className="text-3xl">{stats?.stats.blockedAccounts ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm">Restricted from sign-in</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" /> Weekly AI Usage
            </CardTitle>
            <CardDescription>{totalWeeklyUsage} AI actions in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="usage" fill="var(--color-usage)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4" /> Engagement Trend
            </CardTitle>
            <CardDescription>Daily engagement direction over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="usage" stroke="var(--color-usage)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="perks">Perks</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Search users, review status, and apply account restrictions.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminUserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perks" id="perks">
            <AdminPerksManagement />
          </TabsContent>

          <TabsContent value="logs" id="logs">
            <AdminAuditLogs />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
