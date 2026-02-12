import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Gift, Activity } from "lucide-react";
import { AdminUserManagement } from "./admin-user-management";
import { AdminPerksManagement } from "./admin-perks-management";
import { AdminAuditLogs } from "./admin-audit-logs";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading dashboard stats...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-subheader font-bold mb-1 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground">
          Manage users, perks, and monitor platform activity
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered on platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Accounts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.blockedAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.usersToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              New registrations today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="perks">
            <Gift className="h-4 w-4 mr-2" />
            Perks Management
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="perks" className="space-y-4">
          <AdminPerksManagement />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AdminAuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
