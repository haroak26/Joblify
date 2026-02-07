import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Download,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Resume } from "@shared/schema";

export default function Resumes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);

  // Fetch all resumes
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  // Create resume mutation
  const createResumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resumes", {
        title: "Untitled Resume",
      });
      return response.json();
    },
    onSuccess: (newResume) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setLocation(`/dashboard/resume-builder/${newResume.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Duplicate resume mutation
  const duplicateResumeMutation = useMutation({
    mutationFn: async (resume: Resume) => {
      const response = await apiRequest("POST", "/api/resumes", {
        title: `${resume.title} (Copy)`,
        template: resume.template,
        resumeData: resume.resumeData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume Duplicated",
        description: "Your resume has been duplicated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete resume mutation
  const deleteResumeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume Deleted",
        description: "Your resume has been deleted successfully.",
      });
      setDeleteResumeId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateResume = () => {
    createResumeMutation.mutate();
  };

  const handleEdit = (id: string) => {
    setLocation(`/dashboard/resume-builder/${id}`);
  };

  const handleDuplicate = (resume: Resume) => {
    duplicateResumeMutation.mutate(resume);
  };

  const handleDelete = (id: string) => {
    setDeleteResumeId(id);
  };

  const confirmDelete = () => {
    if (deleteResumeId) {
      deleteResumeMutation.mutate(deleteResumeId);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading resumes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Resumes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your professional resumes
          </p>
        </div>
        <Button onClick={handleCreateResume} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Resume
        </Button>
      </div>

      {!resumes || resumes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by creating your first professional resume. Choose from
              our beautifully designed templates.
            </p>
            <Button onClick={handleCreateResume} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card key={resume.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {resume.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {resume.template.charAt(0).toUpperCase() + resume.template.slice(1)} Template
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(resume.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(resume)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(resume.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-[8.5/11] bg-muted rounded-md mb-4 flex items-center justify-center border">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>Updated {formatDate(resume.updatedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(resume.id)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(resume)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResumeId} onOpenChange={() => setDeleteResumeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
