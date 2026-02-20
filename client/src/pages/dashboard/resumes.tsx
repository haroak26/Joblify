import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getCsrfToken } from "@/lib/queryClient";
import ResumePreview from "@/components/resume-preview/ResumePreview";
import { ResumeListSkeleton } from "@/components/loading-skeleton";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
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

interface ResumeLimits {
  canCreate: boolean;
  limit: number;
  current: number;
  plan: string;
  aiAccessBlocked: boolean;
}

export default function Resumes() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [hasTriggeredAICreate, setHasTriggeredAICreate] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch resume limits
  const { data: limits } = useQuery<ResumeLimits>({
    queryKey: ["/api/resumes/limits"],
  });

  // Create resume mutation
  const createResumeMutation = useMutation({
    mutationFn: async (mode: "traditional" | "ai") => {
      const response = await apiRequest("POST", "/api/resumes", {});
      return { resume: await response.json(), mode };
    },
    onSuccess: ({ resume, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      
      if (mode === "ai") {
        setLocation(`/dashboard/resume-builder/${resume.id}?mode=ai`);
      } else {
        setLocation(`/dashboard/resume-builder/${resume.id}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create resume. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check if we need to trigger AI builder automatically
  useEffect(() => {
    if (search.includes("create=ai") && !hasTriggeredAICreate && !createResumeMutation.isPending) {
      setHasTriggeredAICreate(true);
      createResumeMutation.mutate("ai");
    }
    // Note: createResumeMutation.mutate is intentionally NOT in dependencies
    // as it's a stable function from React Query useMutation
  }, [search, hasTriggeredAICreate, createResumeMutation.isPending]);

  // Fetch all resumes
  const { data: resumes, isLoading, isError, error } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  // Upload resume mutation
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const response = await fetch("/api/resumes/import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || "Failed to upload resume");
        error.code = errorData.code;
        error.limit = errorData.limit;
        error.current = errorData.current;
        error.message = errorData.message || errorData.error;
        throw error;
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been parsed and imported successfully.",
      });
      // Navigate to the resume builder to edit the parsed resume
      if (data.resume?.id) {
        setLocation(`/dashboard/resume-builder/${data.resume.id}`);
      }
    },
    onError: (error: Error) => {
      // Check if this is a limit error
      const errorAny = error as any;
      if (errorAny?.code === "RESUME_LIMIT" || errorAny?.code === "RESUME_IMPORT_LIMIT") {
        setShowUpgradeDialog(true);
      } else {
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload resume. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadResumeMutation.mutate(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    setLocation("/dashboard/resumes/create");
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

  // Page header JSX to avoid duplication
  const pageHeaderContent = (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-semibold">My Resumes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and manage your professional resumes
        </p>
      </div>
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileUpload}
          className="hidden"
        />
        {/* Only show upload button if AI access is not blocked */}
        {!limits?.aiAccessBlocked && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadResumeMutation.isPending}
          >
            {uploadResumeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploadResumeMutation.isPending ? "Parsing..." : "Upload Resume"}
          </Button>
        )}
        <Button onClick={handleCreateResume} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create New Resume
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {pageHeaderContent}
        <ResumeListSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {pageHeaderContent}
        <Card className="border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="text-base font-medium mb-1">Failed to load resumes</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              {error instanceof Error ? error.message : 'An error occurred while loading your resumes. Please try refreshing the page.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {pageHeaderContent}

      {!resumes || resumes.length === 0 ? (
        <Card className="border-dashed border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="text-base font-medium mb-1">No resumes yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Get started by creating your first professional resume. Choose from
              our beautifully designed templates.
            </p>
            <Button onClick={handleCreateResume} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <Card key={resume.id} className="border">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Small preview on the left */}
                <div
                  className="w-16 h-20 bg-gray-100 rounded border overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => handleEdit(resume.id)}
                >
                  <div className="scale-[0.08] origin-top-left pointer-events-none">
                    <div style={{ width: '1250%', height: '1250%' }}>
                      <ResumePreview
                        data={resume.resumeData}
                        template={resume.template}
                      />
                    </div>
                  </div>
                </div>

                {/* Name and date */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{resume.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {resume.template.charAt(0).toUpperCase() + resume.template.slice(1)} Template
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {formatDate(resume.updatedAt)}
                  </p>
                  {resume.originalFilename && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Original: {resume.originalFilename}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(resume.id)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(resume)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(resume.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
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

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        featureName="resumes"
        currentPlan={limits?.plan || "free"}
        limit={limits?.limit}
        current={limits?.current}
      />
    </div>
  );
}
