import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Download, Trash2, Copy } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function ResumeDashboard() {
  const { data: resumes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscription"],
  });

  const canCreateMore = !subscription?.limits?.maxResumes || 
    resumes.length < subscription.limits.maxResumes;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Resumes</h1>
          <p className="text-muted-foreground">
            {resumes.length} / {subscription?.limits?.maxResumes === -1 ? '∞' : subscription?.limits?.maxResumes} resumes
          </p>
        </div>
        <Link href="/dashboard/resumes/new">
          <Button disabled={!canCreateMore}>
            <Plus className="w-4 h-4 mr-2" />
            New Resume
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : resumes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first resume with our AI chat builder
          </p>
          <Link href="/dashboard/resumes/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Resume
            </Button>
          </Link>
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
                <Button size="sm" variant="outline">
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
