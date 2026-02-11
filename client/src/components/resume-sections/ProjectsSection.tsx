import { useState } from "react";
import { ResumeData } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";

interface ProjectsSectionProps {
  data: ResumeData;
  onUpdate: (data: Partial<ResumeData>) => void;
}

export default function ProjectsSection({ data, onUpdate }: ProjectsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    technologies: [] as string[],
    url: "",
  });
  const [techInput, setTechInput] = useState("");

  const handleAddProject = () => {
    if (!newProject.name.trim() || !newProject.description.trim()) return;

    onUpdate({
      projects: [...(data.projects || []), newProject],
    });

    setNewProject({
      name: "",
      description: "",
      technologies: [],
      url: "",
    });
    setTechInput("");
    setIsAdding(false);
  };

  const handleRemoveProject = (index: number) => {
    onUpdate({
      projects: (data.projects || []).filter((_, i) => i !== index),
    });
  };

  const handleUpdateProject = (index: number, field: string, value: any) => {
    const updatedProjects = [...(data.projects || [])];
    updatedProjects[index] = {
      ...updatedProjects[index],
      [field]: value,
    };
    onUpdate({ projects: updatedProjects });
  };

  const handleAddTechnology = (projectIndex?: number) => {
    const tech = techInput.trim();
    if (!tech) return;

    if (projectIndex !== undefined) {
      const updatedProjects = [...(data.projects || [])];
      if (!updatedProjects[projectIndex].technologies.includes(tech)) {
        updatedProjects[projectIndex] = {
          ...updatedProjects[projectIndex],
          technologies: [...updatedProjects[projectIndex].technologies, tech],
        };
        onUpdate({ projects: updatedProjects });
      }
    } else {
      if (!newProject.technologies.includes(tech)) {
        setNewProject({
          ...newProject,
          technologies: [...newProject.technologies, tech],
        });
      }
    }
    setTechInput("");
  };

  const handleRemoveTechnology = (projectIndex: number | undefined, tech: string) => {
    if (projectIndex !== undefined) {
      const updatedProjects = [...(data.projects || [])];
      updatedProjects[projectIndex] = {
        ...updatedProjects[projectIndex],
        technologies: updatedProjects[projectIndex].technologies.filter(t => t !== tech),
      };
      onUpdate({ projects: updatedProjects });
    } else {
      setNewProject({
        ...newProject,
        technologies: newProject.technologies.filter(t => t !== tech),
      });
    }
  };

  const projects = data.projects || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-1" />
          Add Project
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Project</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g., E-commerce Platform"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description *</Label>
              <Textarea
                id="project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Describe the project and your contributions"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-tech">Technologies Used</Label>
              <div className="flex gap-2">
                <Input
                  id="project-tech"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTechnology();
                    }
                  }}
                  placeholder="e.g., React, Node.js, MongoDB"
                />
                <Button type="button" onClick={() => handleAddTechnology()}>
                  Add
                </Button>
              </div>
              {newProject.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newProject.technologies.map((tech, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tech}
                      <button
                        onClick={() => handleRemoveTechnology(undefined, tech)}
                        className="ml-2 hover:text-destructive"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-url">Project URL (Optional)</Label>
              <Input
                id="project-url"
                type="url"
                value={newProject.url}
                onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddProject}>Add Project</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.map((project, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{project.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveProject(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={project.name}
                onChange={(e) => handleUpdateProject(index, "name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={project.description}
                onChange={(e) => handleUpdateProject(index, "description", e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Technologies Used</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTechnology(index);
                    }
                  }}
                  placeholder="Add technology"
                />
                <Button type="button" onClick={() => handleAddTechnology(index)}>
                  Add
                </Button>
              </div>
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.technologies.map((tech, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tech}
                      <button
                        onClick={() => handleRemoveTechnology(index, tech)}
                        className="ml-2 hover:text-destructive"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Project URL</Label>
              <Input
                type="url"
                value={project.url || ""}
                onChange={(e) => handleUpdateProject(index, "url", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {projects.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No projects added yet. Click "Add Project" to get started.</p>
        </div>
      )}
    </div>
  );
}
