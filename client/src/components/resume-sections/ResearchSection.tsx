import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface ResearchSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function ResearchSection({ data, onUpdate }: ResearchSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newResearch, setNewResearch] = useState({
    title: "",
    institution: "",
    startDate: "",
    endDate: null as string | null,
    description: "",
    url: "",
  });
  const [isCurrent, setIsCurrent] = useState(false);

  const handleAddResearch = () => {
    if (!newResearch.title.trim() || !newResearch.institution.trim() || !newResearch.startDate.trim()) return;

    onUpdate({
      research: [...(data.research || []), newResearch],
    });

    setNewResearch({
      title: "",
      institution: "",
      startDate: "",
      endDate: null,
      description: "",
      url: "",
    });
    setIsCurrent(false);
    setIsAdding(false);
  };

  const handleRemoveResearch = (index: number) => {
    onUpdate({
      research: (data.research || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdateResearch = (index: number, field: string, value: any) => {
    const updatedResearch = [...(data.research || [])];
    updatedResearch[index] = {
      ...updatedResearch[index],
      [field]: value,
    };
    onUpdate({ research: updatedResearch });
  };

  const research = data.research || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Research</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Research
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Research</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="research-title">Research Title *</Label>
              <Input
                id="research-title"
                value={newResearch.title}
                onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })}
                placeholder="e.g., Machine Learning in Healthcare"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-institution">Institution *</Label>
              <Input
                id="research-institution"
                value={newResearch.institution}
                onChange={(e) => setNewResearch({ ...newResearch, institution: e.target.value })}
                placeholder="e.g., University Name, Lab Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="research-start">Start Date *</Label>
                <Input
                  id="research-start"
                  type="month"
                  value={newResearch.startDate}
                  onChange={(e) => setNewResearch({ ...newResearch, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="research-end">End Date</Label>
                <Input
                  id="research-end"
                  type="month"
                  value={newResearch.endDate || ""}
                  onChange={(e) => setNewResearch({ ...newResearch, endDate: e.target.value || null })}
                  disabled={isCurrent}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="current-research"
                checked={isCurrent}
                onCheckedChange={(checked) => {
                  setIsCurrent(checked as boolean);
                  if (checked) {
                    setNewResearch({ ...newResearch, endDate: null });
                  }
                }}
              />
              <Label htmlFor="current-research" className="cursor-pointer">
                Ongoing research
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-description">Description *</Label>
              <Textarea
                id="research-description"
                value={newResearch.description}
                onChange={(e) => setNewResearch({ ...newResearch, description: e.target.value })}
                placeholder="Describe the research work and your contributions"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-url">Research URL (Optional)</Label>
              <Input
                id="research-url"
                type="url"
                value={newResearch.url}
                onChange={(e) => setNewResearch({ ...newResearch, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddResearch}>Add Research</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {research.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveResearch(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Research Title</Label>
              <Input
                value={item.title}
                onChange={(e) => handleUpdateResearch(index, "title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                value={item.institution}
                onChange={(e) => handleUpdateResearch(index, "institution", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="month"
                  value={item.startDate}
                  onChange={(e) => handleUpdateResearch(index, "startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="month"
                  value={item.endDate || ""}
                  onChange={(e) => handleUpdateResearch(index, "endDate", e.target.value || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={item.description}
                onChange={(e) => handleUpdateResearch(index, "description", e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Research URL</Label>
              <Input
                type="url"
                value={item.url || ""}
                onChange={(e) => handleUpdateResearch(index, "url", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {research.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No research added yet. Click "Add Research" to get started.</p>
        </div>
      )}
    </div>
  );
}
