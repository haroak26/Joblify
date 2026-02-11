import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface PublicationsSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function PublicationsSection({ data, onUpdate }: PublicationsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPublication, setNewPublication] = useState({
    title: "",
    authors: "",
    journal: "",
    date: "",
    url: "",
  });

  const handleAddPublication = () => {
    if (!newPublication.title.trim() || !newPublication.authors.trim() || !newPublication.journal.trim() || !newPublication.date.trim()) return;

    onUpdate({
      publications: [...(data.publications || []), newPublication],
    });

    setNewPublication({
      title: "",
      authors: "",
      journal: "",
      date: "",
      url: "",
    });
    setIsAdding(false);
  };

  const handleRemovePublication = (index: number) => {
    onUpdate({
      publications: (data.publications || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdatePublication = (index: number, field: string, value: string) => {
    const updatedPublications = [...(data.publications || [])];
    updatedPublications[index] = {
      ...updatedPublications[index],
      [field]: value,
    };
    onUpdate({ publications: updatedPublications });
  };

  const publications = data.publications || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Publications</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Publication
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Publication</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pub-title">Publication Title *</Label>
              <Input
                id="pub-title"
                value={newPublication.title}
                onChange={(e) => setNewPublication({ ...newPublication, title: e.target.value })}
                placeholder="e.g., Deep Learning Approaches for Medical Imaging"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-authors">Authors *</Label>
              <Input
                id="pub-authors"
                value={newPublication.authors}
                onChange={(e) => setNewPublication({ ...newPublication, authors: e.target.value })}
                placeholder="e.g., Smith J., Doe A., Johnson M."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-journal">Journal/Conference *</Label>
              <Input
                id="pub-journal"
                value={newPublication.journal}
                onChange={(e) => setNewPublication({ ...newPublication, journal: e.target.value })}
                placeholder="e.g., IEEE Transactions on Medical Imaging"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-date">Publication Date *</Label>
              <Input
                id="pub-date"
                type="month"
                value={newPublication.date}
                onChange={(e) => setNewPublication({ ...newPublication, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pub-url">Publication URL (Optional)</Label>
              <Input
                id="pub-url"
                type="url"
                value={newPublication.url}
                onChange={(e) => setNewPublication({ ...newPublication, url: e.target.value })}
                placeholder="https://doi.org/..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddPublication}>Add Publication</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {publications.map((pub, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{pub.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePublication(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Publication Title</Label>
              <Input
                value={pub.title}
                onChange={(e) => handleUpdatePublication(index, "title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Authors</Label>
              <Input
                value={pub.authors}
                onChange={(e) => handleUpdatePublication(index, "authors", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Journal/Conference</Label>
              <Input
                value={pub.journal}
                onChange={(e) => handleUpdatePublication(index, "journal", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Publication Date</Label>
              <Input
                type="month"
                value={pub.date}
                onChange={(e) => handleUpdatePublication(index, "date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Publication URL</Label>
              <Input
                type="url"
                value={pub.url || ""}
                onChange={(e) => handleUpdatePublication(index, "url", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {publications.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No publications added yet. Click "Add Publication" to get started.</p>
        </div>
      )}
    </div>
  );
}
