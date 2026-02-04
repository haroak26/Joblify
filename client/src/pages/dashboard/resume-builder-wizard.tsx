import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
}

interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  graduationDate: string;
}

export default function ResumeBuilderWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form state
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
  });

  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    { company: "", position: "", startDate: "", endDate: "", description: "" },
  ]);

  const [education, setEducation] = useState<Education[]>([
    { school: "", degree: "", field: "", graduationDate: "" },
  ]);

  const [skills, setSkills] = useState<string>("");
  const [resumeTitle, setResumeTitle] = useState<string>("My Resume");

  const createResumeMutation = useMutation({
    mutationFn: async () => {
      // Transform wizard data to match backend schema
      const resumeData = {
        personalInfo: {
          name: personalInfo.fullName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          location: personalInfo.location,
          linkedin: "",
          website: "",
        },
        summary: personalInfo.summary,
        experience: workExperiences
          .filter(exp => exp.company || exp.position)
          .map(exp => ({
            company: exp.company,
            title: exp.position,
            location: "",
            startDate: exp.startDate,
            endDate: exp.endDate || null,
            description: exp.description ? exp.description.split('\n').filter(Boolean) : [],
          })),
        education: education
          .filter(edu => edu.school || edu.degree)
          .map(edu => ({
            school: edu.school,
            degree: edu.degree,
            field: edu.field,
            graduationDate: edu.graduationDate,
            gpa: "",
          })),
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: [],
        projects: [],
      };

      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: resumeTitle || "My Resume", 
          template: "modern",
          resumeData: resumeData,
        }),
      });
      if (!res.ok) throw new Error("Failed to create resume");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setLocation(`/dashboard/resumes/${data.resume.id}/edit`);
    },
  });

  const addWorkExperience = () => {
    setWorkExperiences([
      ...workExperiences,
      { company: "", position: "", startDate: "", endDate: "", description: "" },
    ]);
  };

  const updateWorkExperience = (index: number, field: keyof WorkExperience, value: string) => {
    const updated = [...workExperiences];
    updated[index][field] = value;
    setWorkExperiences(updated);
  };

  const removeWorkExperience = (index: number) => {
    setWorkExperiences(workExperiences.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducation([
      ...education,
      { school: "", degree: "", field: "", graduationDate: "" },
    ]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const progress = (step / totalSteps) * 100;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Let's start with your basic information</CardTitle>
              <CardDescription>
                This information will appear at the top of your resume
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={personalInfo.location}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Professional Summary (optional)</Label>
                <Textarea
                  id="summary"
                  value={personalInfo.summary}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, summary: e.target.value })}
                  placeholder="Brief description of your professional background and goals..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Work Experience</CardTitle>
              <CardDescription>
                Add your work history, starting with your most recent position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workExperiences.map((exp, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  {workExperiences.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeWorkExperience(index)}
                    >
                      Remove
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateWorkExperience(index, "company", e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position *</Label>
                      <Input
                        value={exp.position}
                        onChange={(e) => updateWorkExperience(index, "position", e.target.value)}
                        placeholder="Job Title"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateWorkExperience(index, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="month"
                        value={exp.endDate}
                        onChange={(e) => updateWorkExperience(index, "endDate", e.target.value)}
                        placeholder="Leave empty if current"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description & Achievements</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => updateWorkExperience(index, "description", e.target.value)}
                      placeholder="Describe your responsibilities and achievements..."
                      rows={4}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addWorkExperience}>
                + Add Another Position
              </Button>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
              <CardDescription>
                Add your educational background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {education.map((edu, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  {education.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeEducation(index)}
                    >
                      Remove
                    </Button>
                  )}
                  <div className="space-y-2">
                    <Label>School/University *</Label>
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(index, "school", e.target.value)}
                      placeholder="University Name"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Degree *</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, "degree", e.target.value)}
                        placeholder="Bachelor's, Master's, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input
                        value={edu.field}
                        onChange={(e) => updateEducation(index, "field", e.target.value)}
                        placeholder="Computer Science, Business, etc."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Graduation Date</Label>
                    <Input
                      type="month"
                      value={edu.graduationDate}
                      onChange={(e) => updateEducation(index, "graduationDate", e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addEducation}>
                + Add Another Degree
              </Button>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                List your key skills, separated by commas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skills">Skills *</Label>
                <Textarea
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="JavaScript, React, Node.js, Python, Project Management, etc."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  Separate each skill with a comma. Include both technical and soft skills relevant to your target position.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Final Step: Name Your Resume</CardTitle>
              <CardDescription>
                Give your resume a title to help you identify it later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resumeTitle">Resume Title</Label>
                <Input
                  id="resumeTitle"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="e.g., Software Engineer Resume, Marketing Manager Resume"
                />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Ready to create!</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll create your resume and you can further refine it with AI assistance in the editor.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return personalInfo.fullName && personalInfo.email;
      case 2:
        return workExperiences.some(exp => exp.company && exp.position);
      case 3:
        return education.some(edu => edu.school && edu.degree);
      case 4:
        return skills.trim().length > 0;
      case 5:
        return resumeTitle.trim().length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Your Resume</h1>
        <p className="text-muted-foreground">
          Answer a few questions to build your professional resume
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {renderStep()}

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={() => setStep(Math.min(totalSteps, step + 1))}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => createResumeMutation.mutate()}
            disabled={!canProceed() || createResumeMutation.isPending}
          >
            {createResumeMutation.isPending ? (
              <>Creating Resume...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Resume
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
