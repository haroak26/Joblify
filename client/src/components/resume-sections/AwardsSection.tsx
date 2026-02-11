import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface AwardsSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function AwardsSection({ data, onUpdate }: AwardsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAward, setNewAward] = useState({
    title: "",
    issuer: "",
    date: "",
    description: "",
  });

  const handleAddAward = () => {
    if (!newAward.title.trim() || !newAward.issuer.trim() || !newAward.date.trim()) return;

    onUpdate({
      awards: [...(data.awards || []), newAward],
    });

    setNewAward({
      title: "",
      issuer: "",
      date: "",
      description: "",
    });
    setIsAdding(false);
  };

  const handleRemoveAward = (index: number) => {
    onUpdate({
      awards: (data.awards || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdateAward = (index: number, field: string, value: string) => {
    const updatedAwards = [...(data.awards || [])];
    updatedAwards[index] = {
      ...updatedAwards[index],
      [field]: value,
    };
    onUpdate({ awards: updatedAwards });
  };

  const awards = data.awards || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Awards & Honors</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Award
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Award</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="award-title">Award Title *</Label>
              <Input
                id="award-title"
                value={newAward.title}
                onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                placeholder="e.g., Employee of the Year"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award-issuer">Issuing Organization *</Label>
              <Input
                id="award-issuer"
                value={newAward.issuer}
                onChange={(e) => setNewAward({ ...newAward, issuer: e.target.value })}
                placeholder="e.g., Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award-date">Date Received *</Label>
              <Input
                id="award-date"
                type="month"
                value={newAward.date}
                onChange={(e) => setNewAward({ ...newAward, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="award-description">Description (Optional)</Label>
              <Textarea
                id="award-description"
                value={newAward.description}
                onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                placeholder="Brief description of the achievement"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddAward}>Add Award</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {awards.map((award, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{award.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveAward(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Award Title</Label>
              <Input
                value={award.title}
                onChange={(e) => handleUpdateAward(index, "title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Issuing Organization</Label>
              <Input
                value={award.issuer}
                onChange={(e) => handleUpdateAward(index, "issuer", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date Received</Label>
              <Input
                type="month"
                value={award.date}
                onChange={(e) => handleUpdateAward(index, "date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={award.description || ""}
                onChange={(e) => handleUpdateAward(index, "description", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {awards.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No awards added yet. Click "Add Award" to get started.</p>
        </div>
      )}
    </div>
  );
}
