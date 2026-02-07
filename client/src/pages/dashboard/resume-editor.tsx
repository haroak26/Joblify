import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Save, Loader2, Plus, Trash2, User, Briefcase,
  GraduationCap, Wrench, Award, FolderOpen, FileText, Mail,
  Phone, MapPin, Globe, Linkedin, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResumeEditorSkeleton } from "@/components/loading-skeleton";
import { TEMPLATE_COMPONENTS } from "@/components/resume-templates";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@shared/schema";

interface Experience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string | null;
  description: string[];
}

interface Education {
  school: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
}

export default function ResumeEditor() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [newSkill, setNewSkill] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>("modern");

  const { data: resume, isLoading } = useQuery<any>({
    queryKey: [`/api/resumes/${id}`],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${id}`] });
      toast({ title: "Saved", description: "Resume updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export/pdf/${id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate PDF");
      }
      const contentType = res.headers.get("Content-Type");
      if (!contentType || !contentType.includes("application/pdf")) {
        throw new Error("Invalid response format");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume?.title || "resume").replace(/[^a-z0-9]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "PDF Downloaded", description: "Your resume has been downloaded." });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unable to download PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getResumeData = useCallback((): ResumeData => {
    return resume?.resumeData || {
      personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", website: "" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
    };
  }, [resume]);

  // Known safe field paths for resume data updates
  const SAFE_PATHS = new Set([
    "personalInfo.name", "personalInfo.email", "personalInfo.phone",
    "personalInfo.location", "personalInfo.linkedin", "personalInfo.website",
    "summary",
  ]);

  const saveField = useCallback((path: string, value: any) => {
    const data = getResumeData();
    const root = JSON.parse(JSON.stringify(data));

    // Handle known safe top-level and nested paths
    if (SAFE_PATHS.has(path)) {
      const keys = path.split(".");
      if (keys.length === 1) {
        root[keys[0] as keyof ResumeData] = value;
      } else if (keys.length === 2) {
        (root as any)[keys[0]][keys[1]] = value;
      }
      updateMutation.mutate({ resumeData: root });
      return;
    }

    // Handle array item paths like "experience.0.title" or "education.1.school"
    const match = path.match(/^(experience|education|certifications|projects)\.(\d+)\.(\w+)$/);
    if (match) {
      const [, section, indexStr, field] = match;
      const index = parseInt(indexStr, 10);
      const arr = (root as any)[section];
      if (Array.isArray(arr) && index >= 0 && index < arr.length && typeof arr[index] === "object") {
        arr[index][field] = value;
        updateMutation.mutate({ resumeData: root });
      }
      return;
    }
  }, [getResumeData, updateMutation]);

  const addExperience = () => {
    const data = getResumeData();
    const newExp: Experience = { company: "", title: "", location: "", startDate: "", endDate: null, description: [""] };
    updateMutation.mutate({ resumeData: { ...data, experience: [...data.experience, newExp] } });
  };

  const removeExperience = (index: number) => {
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, experience: data.experience.filter((_, i) => i !== index) } });
  };

  const addEducation = () => {
    const data = getResumeData();
    const newEdu: Education = { school: "", degree: "", field: "", graduationDate: "" };
    updateMutation.mutate({ resumeData: { ...data, education: [...data.education, newEdu] } });
  };

  const removeEducation = (index: number) => {
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, education: data.education.filter((_, i) => i !== index) } });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, skills: [...data.skills, newSkill.trim()] } });
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, skills: data.skills.filter((_, i) => i !== index) } });
  };

  const addCertification = () => {
    const data = getResumeData();
    const newCert: Certification = { name: "", issuer: "", date: "" };
    updateMutation.mutate({ resumeData: { ...data, certifications: [...(data.certifications || []), newCert] } });
  };

  const removeCertification = (index: number) => {
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, certifications: (data.certifications || []).filter((_, i) => i !== index) } });
  };

  const addProject = () => {
    const data = getResumeData();
    const newProj: Project = { name: "", description: "", technologies: [], url: "" };
    updateMutation.mutate({ resumeData: { ...data, projects: [...(data.projects || []), newProj] } });
  };

  const removeProject = (index: number) => {
    const data = getResumeData();
    updateMutation.mutate({ resumeData: { ...data, projects: (data.projects || []).filter((_, i) => i !== index) } });
  };

  const addBulletPoint = (expIndex: number) => {
    const data = getResumeData();
    const exp = [...data.experience];
    exp[expIndex] = { ...exp[expIndex], description: [...exp[expIndex].description, ""] };
    updateMutation.mutate({ resumeData: { ...data, experience: exp } });
  };

  const removeBulletPoint = (expIndex: number, bulletIndex: number) => {
    const data = getResumeData();
    const exp = [...data.experience];
    exp[expIndex] = { ...exp[expIndex], description: exp[expIndex].description.filter((_, i) => i !== bulletIndex) };
    updateMutation.mutate({ resumeData: { ...data, experience: exp } });
  };

  useEffect(() => {
    if (resume?.template && resume.template !== selectedTemplate) {
      setSelectedTemplate(resume.template as ResumeTemplateId);
    }
  }, [resume?.template, selectedTemplate]);

  if (isLoading || !resume) return <ResumeEditorSkeleton />;

  const resumeData = getResumeData();
  const TemplateComponent = TEMPLATE_COMPONENTS[selectedTemplate] ?? TEMPLATE_COMPONENTS.modern;
  const sections = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "summary", label: "Summary", icon: FileText },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Wrench },
    { id: "certifications", label: "Certifications", icon: Award },
    { id: "projects", label: "Projects", icon: FolderOpen },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <Input
            defaultValue={resume.title}
            placeholder="Resume Title"
            className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 max-w-md"
            onBlur={(e) => {
              if (e.target.value !== resume.title) {
                updateMutation.mutate({ title: e.target.value });
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={selectedTemplate}
            onValueChange={(value: ResumeTemplateId) => {
              setSelectedTemplate(value);
              updateMutation.mutate({ template: value });
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(RESUME_TEMPLATES).map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Section nav */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card className="sticky top-6">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Middle - Editor */}
        <div className="col-span-12 md:col-span-9 lg:col-span-5">
          <Card>
            <CardContent className="p-6 space-y-6">
              {updateMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </div>
              )}

              {/* Personal Info */}
              {activeSection === "personal" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="w-5 h-5" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <Input
                        defaultValue={resumeData.personalInfo.name}
                        placeholder="John Doe"
                        onBlur={(e) => saveField("personalInfo.name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                        <Input
                          defaultValue={resumeData.personalInfo.email}
                          placeholder="john@example.com"
                          type="email"
                          onBlur={(e) => saveField("personalInfo.email", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
                        <Input
                          defaultValue={resumeData.personalInfo.phone}
                          placeholder="+1 (555) 123-4567"
                          onBlur={(e) => saveField("personalInfo.phone", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
                      <Input
                        defaultValue={resumeData.personalInfo.location}
                        placeholder="San Francisco, CA"
                        onBlur={(e) => saveField("personalInfo.location", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn</label>
                        <Input
                          defaultValue={resumeData.personalInfo.linkedin || ""}
                          placeholder="linkedin.com/in/johndoe"
                          onBlur={(e) => saveField("personalInfo.linkedin", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label>
                        <Input
                          defaultValue={resumeData.personalInfo.website || ""}
                          placeholder="johndoe.com"
                          onBlur={(e) => saveField("personalInfo.website", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {activeSection === "summary" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Professional Summary
                  </h3>
                  <Textarea
                    defaultValue={resumeData.summary}
                    placeholder="A brief professional summary highlighting your key qualifications, experience, and career objectives..."
                    rows={6}
                    onBlur={(e) => saveField("summary", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Keep your summary concise (2-4 sentences) and focused on your most relevant qualifications.
                  </p>
                </div>
              )}

              {/* Experience */}
              {activeSection === "experience" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Briefcase className="w-5 h-5" /> Work Experience
                    </h3>
                    <Button size="sm" variant="outline" onClick={addExperience}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {resumeData.experience.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No experience added yet. Click "Add" to get started.
                    </p>
                  )}
                  {resumeData.experience.map((exp, i) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Position {i + 1}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeExperience(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Job Title</label>
                          <Input defaultValue={exp.title} placeholder="Software Engineer" onBlur={(e) => saveField(`experience.${i}.title`, e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Company</label>
                          <Input defaultValue={exp.company} placeholder="Google" onBlur={(e) => saveField(`experience.${i}.company`, e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Location</label>
                        <Input defaultValue={exp.location} placeholder="Mountain View, CA" onBlur={(e) => saveField(`experience.${i}.location`, e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Start Date</label>
                          <Input defaultValue={exp.startDate} placeholder="Jan 2020" onBlur={(e) => saveField(`experience.${i}.startDate`, e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">End Date</label>
                          <Input defaultValue={exp.endDate || ""} placeholder="Present" onBlur={(e) => saveField(`experience.${i}.endDate`, e.target.value || null)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground">Achievements / Responsibilities</label>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addBulletPoint(i)}>
                            <Plus className="w-3 h-3 mr-1" /> Add Bullet
                          </Button>
                        </div>
                        {exp.description.map((desc, j) => (
                          <div key={j} className="flex gap-2">
                            <span className="text-muted-foreground mt-2.5">•</span>
                            <Input
                              defaultValue={desc}
                              placeholder="Describe your achievement or responsibility..."
                              className="flex-1"
                              onBlur={(e) => {
                                const data = getResumeData();
                                const experience = [...data.experience];
                                const descriptions = [...experience[i].description];
                                descriptions[j] = e.target.value;
                                experience[i] = { ...experience[i], description: descriptions };
                                updateMutation.mutate({ resumeData: { ...data, experience } });
                              }}
                            />
                            {exp.description.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => removeBulletPoint(i, j)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Education */}
              {activeSection === "education" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" /> Education
                    </h3>
                    <Button size="sm" variant="outline" onClick={addEducation}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {resumeData.education.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No education added yet. Click "Add" to get started.
                    </p>
                  )}
                  {resumeData.education.map((edu, i) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Education {i + 1}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeEducation(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">School</label>
                        <Input defaultValue={edu.school} placeholder="Stanford University" onBlur={(e) => saveField(`education.${i}.school`, e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Degree</label>
                          <Input defaultValue={edu.degree} placeholder="Bachelor of Science" onBlur={(e) => saveField(`education.${i}.degree`, e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Field of Study</label>
                          <Input defaultValue={edu.field} placeholder="Computer Science" onBlur={(e) => saveField(`education.${i}.field`, e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Graduation Date</label>
                          <Input defaultValue={edu.graduationDate} placeholder="May 2020" onBlur={(e) => saveField(`education.${i}.graduationDate`, e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">GPA (optional)</label>
                          <Input defaultValue={edu.gpa || ""} placeholder="3.8" onBlur={(e) => saveField(`education.${i}.gpa`, e.target.value)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Skills */}
              {activeSection === "skills" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5" /> Skills
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill (e.g., JavaScript, Project Management)"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                      className="flex-1"
                    />
                    <Button onClick={addSkill} disabled={!newSkill.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive/10" onClick={() => removeSkill(i)}>
                        {skill}
                        <Trash2 className="w-3 h-3 ml-2 text-muted-foreground" />
                      </Badge>
                    ))}
                  </div>
                  {resumeData.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No skills added yet. Type a skill and press Enter.
                    </p>
                  )}
                </div>
              )}

              {/* Certifications */}
              {activeSection === "certifications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Award className="w-5 h-5" /> Certifications
                    </h3>
                    <Button size="sm" variant="outline" onClick={addCertification}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {(!resumeData.certifications || resumeData.certifications.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No certifications added yet. Click "Add" to get started.
                    </p>
                  )}
                  {(resumeData.certifications || []).map((cert, i) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Certification {i + 1}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeCertification(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Certification Name</label>
                        <Input defaultValue={cert.name} placeholder="AWS Solutions Architect" onBlur={(e) => saveField(`certifications.${i}.name`, e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Issuer</label>
                          <Input defaultValue={cert.issuer} placeholder="Amazon Web Services" onBlur={(e) => saveField(`certifications.${i}.issuer`, e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Date</label>
                          <Input defaultValue={cert.date} placeholder="2023" onBlur={(e) => saveField(`certifications.${i}.date`, e.target.value)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Projects */}
              {activeSection === "projects" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" /> Projects
                    </h3>
                    <Button size="sm" variant="outline" onClick={addProject}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {(!resumeData.projects || resumeData.projects.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No projects added yet. Click "Add" to get started.
                    </p>
                  )}
                  {(resumeData.projects || []).map((proj, i) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Project {i + 1}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeProject(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Project Name</label>
                        <Input defaultValue={proj.name} placeholder="E-Commerce Platform" onBlur={(e) => saveField(`projects.${i}.name`, e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Textarea defaultValue={proj.description} placeholder="Brief description of the project..." rows={2} onBlur={(e) => saveField(`projects.${i}.description`, e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Technologies (comma-separated)</label>
                        <Input
                          defaultValue={proj.technologies.join(", ")}
                          placeholder="React, Node.js, PostgreSQL"
                          onBlur={(e) => saveField(`projects.${i}.technologies`, e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">URL (optional)</label>
                        <Input defaultValue={proj.url || ""} placeholder="https://github.com/..." onBlur={(e) => saveField(`projects.${i}.url`, e.target.value)} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side - Live Preview */}
        <div className="col-span-12 lg:col-span-5">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-4 text-black shadow-inner overflow-y-auto max-h-[700px] min-h-[500px]">
                  <TemplateComponent resumeData={resumeData} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
