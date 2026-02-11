import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface LeadershipSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function LeadershipSection({ data, onUpdate }: LeadershipSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLeadership, setNewLeadership] = useState({
    title: "",
    organization: "",
    startDate: "",
    endDate: null as string | null,
    description: "",
  });
  const [isCurrent, setIsCurrent] = useState(false);

  const handleAddLeadership = () => {
    if (!newLeadership.title.trim() || !newLeadership.organization.trim() || !newLeadership.startDate.trim()) return;

    onUpdate({
      leadership: [...(data.leadership || []), newLeadership],
    });

    setNewLeadership({
      title: "",
      organization: "",
      startDate: "",
      endDate: null,
      description: "",
    });
    setIsCurrent(false);
    setIsAdding(false);
  };

  const handleRemoveLeadership = (index: number) => {
    onUpdate({
      leadership: (data.leadership || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdateLeadership = (index: number, field: string, value: any) => {
    const updatedLeadership = [...(data.leadership || [])];
    updatedLeadership[index] = {
      ...updatedLeadership[index],
      [field]: value,
    };
    onUpdate({ leadership: updatedLeadership });
  };

  const leadership = data.leadership || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Leadership</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Leadership Role
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Leadership Role</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leadership-title">Title *</Label>
              <Input
                id="leadership-title"
                value={newLeadership.title}
                onChange={(e) => setNewLeadership({ ...newLeadership, title: e.target.value })}
                placeholder="e.g., Team Lead, President"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadership-org">Organization *</Label>
              <Input
                id="leadership-org"
                value={newLeadership.organization}
                onChange={(e) => setNewLeadership({ ...newLeadership, organization: e.target.value })}
                placeholder="e.g., Company Name, Club Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadership-start">Start Date *</Label>
                <Input
                  id="leadership-start"
                  type="month"
                  value={newLeadership.startDate}
                  onChange={(e) => setNewLeadership({ ...newLeadership, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadership-end">End Date</Label>
                <Input
                  id="leadership-end"
                  type="month"
                  value={newLeadership.endDate || ""}
                  onChange={(e) => setNewLeadership({ ...newLeadership, endDate: e.target.value || null })}
                  disabled={isCurrent}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="current-role"
                checked={isCurrent}
                onCheckedChange={(checked) => {
                  setIsCurrent(checked as boolean);
                  if (checked) {
                    setNewLeadership({ ...newLeadership, endDate: null });
                  }
                }}
              />
              <Label htmlFor="current-role" className="cursor-pointer">
                Current position
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadership-description">Description *</Label>
              <Textarea
                id="leadership-description"
                value={newLeadership.description}
                onChange={(e) => setNewLeadership({ ...newLeadership, description: e.target.value })}
                placeholder="Describe your responsibilities and achievements"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddLeadership}>Add Leadership Role</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {leadership.map((role, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{role.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveLeadership(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={role.title}
                onChange={(e) => handleUpdateLeadership(index, "title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={role.organization}
                onChange={(e) => handleUpdateLeadership(index, "organization", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="month"
                  value={role.startDate}
                  onChange={(e) => handleUpdateLeadership(index, "startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="month"
                  value={role.endDate || ""}
                  onChange={(e) => handleUpdateLeadership(index, "endDate", e.target.value || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={role.description}
                onChange={(e) => handleUpdateLeadership(index, "description", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {leadership.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No leadership roles added yet. Click "Add Leadership Role" to get started.</p>
        </div>
      )}
    </div>
  );
}
