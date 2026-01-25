import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "hourly";
  time: string;
  days?: string[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export default function Schedules() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    frequency: "daily" as "daily" | "weekly" | "hourly",
    time: "09:00",
  });

  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => 
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
    toast({
      title: "Schedule updated",
      description: "Your schedule has been updated successfully.",
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast({
      title: "Schedule deleted",
      description: "Your schedule has been removed.",
    });
  };

  const handleAddSchedule = () => {
    if (!newSchedule.name) {
      toast({
        title: "Name required",
        description: "Please enter a name for your schedule.",
        variant: "destructive",
      });
      return;
    }

    const schedule: Schedule = {
      id: Date.now().toString(),
      name: newSchedule.name,
      frequency: newSchedule.frequency,
      time: newSchedule.time,
      enabled: true,
      nextRun: new Date(Date.now() + 86400000).toISOString(),
    };

    setSchedules(prev => [...prev, schedule]);
    setNewSchedule({ name: "", frequency: "daily", time: "09:00" });
    setShowAddForm(false);
    toast({
      title: "Schedule created",
      description: "Your new job scan schedule has been created.",
    });
  };

  const handleRunNow = (id: string) => {
    toast({
      title: "Job scan started",
      description: "Scanning for new opportunities now...",
    });
  };

  const formatDate = (dateStr?: string) => {
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-schedules-title">Schedules</h1>
          <p className="text-muted-foreground">Automate your job discovery with recurring scans</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="gap-2"
          data-testid="button-add-schedule"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </Button>
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-schedule">
                Cancel
              </Button>
              <Button onClick={handleAddSchedule} data-testid="button-save-schedule">
                Create Schedule
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${schedule.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Clock className={`w-5 h-5 ${schedule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{schedule.name}</h3>
                        <Badge variant={schedule.enabled ? "default" : "secondary"}>
                          {schedule.enabled ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                        <span>{getFrequencyLabel(schedule.frequency)} at {schedule.time}</span>
                        <span>Next: {formatDate(schedule.nextRun)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(schedule.id)}
                      className="gap-1"
                      data-testid={`button-run-${schedule.id}`}
                    >
                      <Play className="w-3 h-3" />
                      Run Now
                    </Button>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleSchedule(schedule.id)}
                      data-testid={`switch-schedule-${schedule.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-muted-foreground"
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
