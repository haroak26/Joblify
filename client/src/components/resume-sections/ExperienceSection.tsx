import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface ExperienceSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

type Experience = ResumeData["experience"][0];

export default function ExperienceSection({ data, onUpdate }: ExperienceSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Experience>({
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: null,
    description: [""],
  });

  const resetForm = () => {
    setFormData({
      company: "",
      title: "",
      location: "",
      startDate: "",
      endDate: null,
      description: [""],
    });
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    if (!formData.company || !formData.title) return;
    
    onUpdate({
      experience: [...data.experience, formData],
    });
    resetForm();
  };

  const handleUpdate = () => {
    if (editingIndex === null || !formData.company || !formData.title) return;
    
    const updated = [...data.experience];
    updated[editingIndex] = formData;
    onUpdate({ experience: updated });
    resetForm();
  };

  const handleDelete = (index: number) => {
    onUpdate({
      experience: data.experience.filter((_, i) => i !== index),
    });
  };

  const handleEdit = (index: number) => {
    setFormData(data.experience[index]);
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleDescriptionChange = (index: number, value: string) => {
    const newDescription = [...formData.description];
    newDescription[index] = value;
    setFormData({ ...formData, description: newDescription });
  };

  const addDescriptionPoint = () => {
    setFormData({
      ...formData,
      description: [...formData.description, ""],
    });
  };

  const removeDescriptionPoint = (index: number) => {
    setFormData({
      ...formData,
      description: formData.description.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {data.experience.map((exp, index) => (
        <Card key={index} className="border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{exp.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {exp.company} • {exp.location}
                </p>
                <p className="text-sm text-muted-foreground">
                  {exp.startDate} - {exp.endDate || "Present"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(index)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {exp.description.length > 0 && (
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {exp.description.map((desc, i) => (
                  <li key={i} className="text-sm">{desc}</li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ))}

      {(isAdding || editingIndex !== null) && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Tech Corp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="month"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="month"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                    placeholder="Present"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Responsibilities & Achievements</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addDescriptionPoint}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Point
                  </Button>
                </div>
                {formData.description.map((desc, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea
                      value={desc}
                      onChange={(e) => handleDescriptionChange(i, e.target.value)}
                      placeholder="Describe your responsibilities and achievements..."
                      rows={2}
                    />
                    {formData.description.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeDescriptionPoint(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={editingIndex !== null ? handleUpdate : handleAdd}>
                  <Check className="h-4 w-4 mr-1" />
                  {editingIndex !== null ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdding && editingIndex === null && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Work Experience
        </Button>
      )}
    </div>
  );
}
