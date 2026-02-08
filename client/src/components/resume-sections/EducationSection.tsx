import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface EducationSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

type Education = ResumeData["education"][0];

export default function EducationSection({ data, onUpdate }: EducationSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Education>({
    school: "",
    degree: "",
    field: "",
    graduationDate: "",
    gpa: "",
  });

  const resetForm = () => {
    setFormData({
      school: "",
      degree: "",
      field: "",
      graduationDate: "",
      gpa: "",
    });
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleAdd = () => {
    if (!formData.school || !formData.degree) return;
    
    onUpdate({
      education: [...data.education, formData],
    });
    resetForm();
  };

  const handleUpdate = () => {
    if (editingIndex === null || !formData.school || !formData.degree) return;
    
    const updated = [...data.education];
    updated[editingIndex] = formData;
    onUpdate({ education: updated });
    resetForm();
  };

  const handleDelete = (index: number) => {
    onUpdate({
      education: data.education.filter((_, i) => i !== index),
    });
  };

  const handleEdit = (index: number) => {
    setFormData(data.education[index]);
    setEditingIndex(index);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {data.education.map((edu, index) => (
        <Card key={index} className="border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{edu.degree} in {edu.field}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{edu.school}</p>
                <p className="text-sm text-muted-foreground">
                  Graduated: {edu.graduationDate}
                  {edu.gpa && ` • GPA: ${edu.gpa}`}
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
        </Card>
      ))}

      {(isAdding || editingIndex !== null) && (
        <Card className="border border-dashed">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School/University</Label>
                  <Input
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="Harvard University"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    placeholder="Bachelor of Science"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Graduation Date</Label>
                  <Input
                    type="month"
                    value={formData.graduationDate}
                    onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA (Optional)</Label>
                  <Input
                    value={formData.gpa || ""}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    placeholder="3.8"
                  />
                </div>
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
          Add Education
        </Button>
      )}
    </div>
  );
}
