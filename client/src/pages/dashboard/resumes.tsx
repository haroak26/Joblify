import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Upload, MessageSquare, ListChecks, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RESUME_TEMPLATES, type Resume, type ResumeTemplateId } from "@shared/schema";
import { ResumeListSkeleton } from "@/components/loading-skeleton";

export default function ResumeDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createModeDialogOpen, setCreateModeDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<ResumeTemplateId>("professional");

  const { data: resumesData, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });
  
  // Ensure resumes is always an array
  const resumes = Array.isArray(resumesData) ? resumesData : [];

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscription"],
  });

  const canCreateMore = !subscription?.limits?.maxResumes || 
    resumes.length < subscription.limits.maxResumes;

  const downloadPdf = async (resumeId: string, resumeTitle: string) => {
    try {
      const res = await fetch(`/api/export/pdf/${resumeId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resumeTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Your resume has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name.replace(/\.(pdf|docx)$/i, ""));
      formData.append("template", template);
      
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume Imported!",
        description: "Your resume has been successfully imported.",
      });
      setUploadDialogOpen(false);
      setFile(null);
      setTitle("");
      setTemplate("professional");
      navigate(`/dashboard/resumes/${data.resume.id}/edit`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!canCreateMore}>
                <Upload className="w-4 h-4 mr-2" />
                Import Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Resume</DialogTitle>
                <DialogDescription>
                  Upload your existing resume (PDF or DOCX) to import it into Joblify
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resume-title">Resume Title</Label>
                  <Input
                    id="resume-title"
                    placeholder="e.g., Software Engineer Resume"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume-file">Resume File</Label>
                  <Input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Resume Style</Label>
                  <Select value={template} onValueChange={(value: ResumeTemplateId) => setTemplate(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RESUME_TEMPLATES).map((templateOption) => (
                        <SelectItem key={templateOption.id} value={templateOption.id}>
                          {templateOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the design that best matches the look you want for your imported resume.
                  </p>
                </div>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={!file || uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? "Importing..." : "Import Resume"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createModeDialogOpen} onOpenChange={setCreateModeDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateMore}>
                <Plus className="w-4 h-4 mr-2" />
                New Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Resume Builder Mode</DialogTitle>
                <DialogDescription>
                  Select how you'd like to create your resume
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Card
                  className="p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setCreateModeDialogOpen(false);
                    navigate("/dashboard/resume-chat");
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI Chat Mode</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Our unique conversational AI guides you through building your resume by asking intelligent questions.
                      </p>
                      <p className="text-xs text-primary font-medium">Recommended for most users</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className="p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setCreateModeDialogOpen(false);
                    navigate("/dashboard/resumes/template-select");
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <ListChecks className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Traditional Mode</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Manually fill out a step-by-step form with traditional input fields and sections.
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">For those who prefer structured forms</p>
                    </div>
                  </div>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <ResumeListSkeleton />
      ) : resumes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first resume with AI assistance
          </p>
          <Dialog open={createModeDialogOpen} onOpenChange={setCreateModeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Resume Builder Mode</DialogTitle>
                <DialogDescription>
                  Select how you'd like to create your resume
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Card
                  className="p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setCreateModeDialogOpen(false);
                    navigate("/dashboard/resume-chat");
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI Chat Mode</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Our unique conversational AI guides you through building your resume by asking intelligent questions.
                      </p>
                      <p className="text-xs text-primary font-medium">Recommended for most users</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className="p-6 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setCreateModeDialogOpen(false);
                    navigate("/dashboard/resumes/template-select");
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <ListChecks className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Traditional Mode</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Manually fill out a step-by-step form with traditional input fields and sections.
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">For those who prefer structured forms</p>
                    </div>
                  </div>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume: any) => (
            <Card key={resume.id} className="p-6">
              <h3 className="font-semibold text-lg mb-2">{resume.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Updated {formatDistanceToNow(new Date(resume.updatedAt))} ago
              </p>
              <div className="flex gap-2">
                <Link href={`/dashboard/resumes/${resume.id}/edit`}>
                  <Button size="sm" variant="outline">Edit</Button>
                </Link>
                <Link href={`/dashboard/resumes/${resume.id}/chat`}>
                  <Button size="sm" variant="outline">Chat</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => downloadPdf(resume.id, resume.title)}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
