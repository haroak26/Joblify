import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Plus, Trash2, Play, Lock, Crown, Loader2 } from "lucide-react";
import { SiReddit, SiX, SiFacebook } from "react-icons/si";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id: string;
  userId: string;
  name: string;
  frequency: "daily" | "weekly" | "hourly";
  time: string;
  days: string[];
  platforms: ("reddit" | "x" | "facebook")[];
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

interface SchedulesResponse {
  schedules: Schedule[];
}

interface SubscriptionResponse {
  subscription: { plan: string };
  limits: { hasScheduleAccess: boolean; maxSchedules: number };
}

const platformOptions = [
  { id: "reddit" as const, name: "Reddit", icon: SiReddit, color: "text-orange-500" },
  { id: "x" as const, name: "X (Twitter)", icon: SiX, color: "text-foreground" },
  { id: "facebook" as const, name: "Facebook", icon: SiFacebook, color: "text-blue-600" },
];

export default function Schedules() {
  const { toast } = useToast();
  
  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });

  const schedulesQuery = useQuery<SchedulesResponse>({
    queryKey: ["/api/schedules"],
    enabled: subscriptionQuery.data?.limits.hasScheduleAccess ?? false,
  });

  const hasAccess = subscriptionQuery.data?.limits.hasScheduleAccess ?? false;
  const maxSchedules = subscriptionQuery.data?.limits.maxSchedules ?? 0;
  const scheduleLimitLabel = maxSchedules === -1 ? "Unlimited" : maxSchedules;
  const schedules = schedulesQuery.data?.schedules ?? [];
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    frequency: "daily" as "daily" | "weekly" | "hourly",
    time: "09:00",
    platforms: ["reddit", "x", "facebook"] as ("reddit" | "x" | "facebook")[],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSchedule) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setNewSchedule({ name: "", frequency: "daily", time: "09:00", platforms: ["reddit", "x", "facebook"] });
      setShowAddForm(false);
      toast({ title: "Schedule created", description: "Your schedule has been created successfully." });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to create schedule.";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Schedule> }) => {
      const response = await apiRequest("PATCH", `/api/schedules/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/schedules/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule deleted", description: "Your schedule has been deleted." });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/schedules/${id}/run`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ 
        title: "Scan complete", 
        description: `Found ${data.count} new job${data.count === 1 ? '' : 's'}.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run schedule.", variant: "destructive" });
    },
  });

  const handleToggleSchedule = (id: string, enabled: boolean) => {
    updateMutation.mutate({ id, updates: { enabled: !enabled } });
  };

  const handleDeleteSchedule = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleAddSchedule = () => {
    if (!newSchedule.name || newSchedule.platforms.length === 0) return;
    createMutation.mutate(newSchedule);
  };

  const handleRunNow = (id: string) => {
    runMutation.mutate(id);
  };

  const togglePlatform = (platform: "reddit" | "x" | "facebook") => {
    setNewSchedule(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "hourly": return "Every hour";
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      default: return freq;
    }
  };

  if (subscriptionQuery.isLoading || (hasAccess && schedulesQuery.isLoading)) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 sm:space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 sm:space-y-12">
        <Card className="border-primary/20">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-schedules-locked">Schedules - Paid Feature</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Automate your job discovery with scheduled scans. Upgrade to Plus or Ultra to unlock this feature 
              and never miss a new opportunity.
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4 text-primary" />
                <span>Plus includes 100 jobs/month, unlimited skills, and 2 schedules</span>
              </div>
              <Button asChild className="gap-2" data-testid="button-upgrade-schedules">
                <Link href="/dashboard/account">
                  <Crown className="w-4 h-4" />
                  Upgrade
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-schedules-title">Schedules</h1>
          <p className="text-muted-foreground">Automate your job discovery with recurring scans</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-muted-foreground">
          <span>Schedules: {schedules.length}/{scheduleLimitLabel}</span>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="gap-2 w-full sm:w-auto"
            data-testid="button-add-schedule"
            disabled={maxSchedules !== -1 && schedules.length >= maxSchedules}
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card data-testid="card-add-schedule">
          <CardHeader>
            <CardTitle>Create New Schedule</CardTitle>
            <CardDescription>Set up automated job scans to run at specific times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                placeholder="e.g., Morning Job Scan"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                className="h-10"
                data-testid="input-schedule-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={newSchedule.frequency}
                  onValueChange={(v) => setNewSchedule(prev => ({ ...prev, frequency: v as any }))}
                >
                  <SelectTrigger className="h-10" data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                  className="h-10"
                  data-testid="input-schedule-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platforms to Scan</Label>
              <div className="flex flex-wrap gap-3">
                {platformOptions.map((platform) => (
                  <label
                    key={platform.id}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      newSchedule.platforms.includes(platform.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    data-testid={`checkbox-platform-${platform.id}`}
                  >
                    <Checkbox
                      checked={newSchedule.platforms.includes(platform.id)}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <platform.icon className={`w-4 h-4 ${platform.color}`} />
                    <span className="text-sm">{platform.name}</span>
                  </label>
                ))}
              </div>
              {newSchedule.platforms.length === 0 && (
                <p className="text-sm text-destructive">Select at least one platform</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="w-full sm:w-auto" data-testid="button-cancel-schedule">
                Cancel
              </Button>
              <Button 
                onClick={handleAddSchedule} 
                disabled={!newSchedule.name || newSchedule.platforms.length === 0 || createMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-save-schedule"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  'Create Schedule'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Schedules Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first schedule to automate job discovery
              </p>
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${schedule.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Clock className={`w-5 h-5 ${schedule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{schedule.name}</h3>
                        <Badge variant={schedule.enabled ? "default" : "secondary"}>
                          {schedule.enabled ? "Active" : "Paused"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {schedule.platforms?.map((p) => {
                            const platform = platformOptions.find(opt => opt.id === p);
                            return platform ? (
                              <platform.icon key={p} className={`w-4 h-4 ${platform.color}`} title={platform.name} />
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                        <span>{getFrequencyLabel(schedule.frequency)} at {schedule.time}</span>
                        <span>Next: {formatDate(schedule.nextRun)}</span>
                        {schedule.lastRun && <span>Last: {formatDate(schedule.lastRun)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(schedule.id)}
                      className="gap-1"
                      disabled={runMutation.isPending}
                      data-testid={`button-run-${schedule.id}`}
                    >
                      {runMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Run Now
                    </Button>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.enabled)}
                      data-testid={`switch-schedule-${schedule.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-muted-foreground"
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${schedule.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
