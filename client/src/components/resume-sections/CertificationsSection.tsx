import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface CertificationsSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function CertificationsSection({ data, onUpdate }: CertificationsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCertification, setNewCertification] = useState({
    name: "",
    issuer: "",
    date: "",
  });

  const handleAddCertification = () => {
    if (!newCertification.name.trim() || !newCertification.issuer.trim() || !newCertification.date.trim()) return;

    onUpdate({
      certifications: [...(data.certifications || []), newCertification],
    });

    setNewCertification({
      name: "",
      issuer: "",
      date: "",
    });
    setIsAdding(false);
  };

  const handleRemoveCertification = (index: number) => {
    onUpdate({
      certifications: (data.certifications || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdateCertification = (index: number, field: string, value: string) => {
    const updatedCertifications = [...(data.certifications || [])];
    updatedCertifications[index] = {
      ...updatedCertifications[index],
      [field]: value,
    };
    onUpdate({ certifications: updatedCertifications });
  };

  const certifications = data.certifications || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Certifications</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Certification
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Certification</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cert-name">Certification Name *</Label>
              <Input
                id="cert-name"
                value={newCertification.name}
                onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                placeholder="e.g., AWS Certified Solutions Architect"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-issuer">Issuing Organization *</Label>
              <Input
                id="cert-issuer"
                value={newCertification.issuer}
                onChange={(e) => setNewCertification({ ...newCertification, issuer: e.target.value })}
                placeholder="e.g., Amazon Web Services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-date">Date Obtained *</Label>
              <Input
                id="cert-date"
                type="month"
                value={newCertification.date}
                onChange={(e) => setNewCertification({ ...newCertification, date: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddCertification}>Add Certification</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {certifications.map((cert, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{cert.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveCertification(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Certification Name</Label>
              <Input
                value={cert.name}
                onChange={(e) => handleUpdateCertification(index, "name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Issuing Organization</Label>
              <Input
                value={cert.issuer}
                onChange={(e) => handleUpdateCertification(index, "issuer", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date Obtained</Label>
              <Input
                type="month"
                value={cert.date}
                onChange={(e) => handleUpdateCertification(index, "date", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {certifications.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No certifications added yet. Click "Add Certification" to get started.</p>
        </div>
      )}
    </div>
  );
}
