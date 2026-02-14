import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, TrendingUp, BarChart3 } from "lucide-react";
import { AdminUserManagement } from "./admin-user-management";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AdminDashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<{ aiUsageByDay?: Array<{ name: string; usage: number; date: string }> }>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const chartConfig = {
    usage: {
      label: "AI Usage",
      color: "hsl(var(--primary))",
    },
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading dashboard stats...</div>;
  }

  // Use real data from API, fallback to empty array if not available
  const aiUsageData = stats?.aiUsageByDay || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground">
          Manage users and monitor AI platform activity
        </p>
      </div>

      {/* AI Usage Graphs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              AI Usage This Week
            </CardTitle>
            <CardDescription>Daily AI feature interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={aiUsageData}>
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
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              AI Usage Trend
            </CardTitle>
            <CardDescription>Weekly AI engagement pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart data={aiUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="usage" stroke="var(--color-usage)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage users, view details, and award perks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserManagement />
        </CardContent>
      </Card>
    </div>
  );
}
