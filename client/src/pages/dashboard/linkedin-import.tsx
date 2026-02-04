import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LinkedInImport() {
  const [urls, setUrls] = useState<string[]>([""]);
  const [importedJobs, setImportedJobs] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (jobUrls: string[]) => {
      const res = await fetch("/api/jobs/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: jobUrls }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import jobs");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportedJobs(data.jobs || []);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Jobs Imported!",
        description: `Successfully imported ${data.count} job(s) from LinkedIn.`,
      });
      // Reset form
      setUrls([""]);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Could not import jobs. Please check your URLs and try again.",
        variant: "destructive",
      });
    },
  });

  const addUrlField = () => {
    setUrls([...urls, ""]);
  };

  const removeUrlField = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleImport = () => {
    const validUrls = urls.filter(url => url.trim() !== "");
    if (validUrls.length === 0) {
      toast({
        title: "No URLs",
        description: "Please add at least one LinkedIn job URL.",
        variant: "destructive",
      });
      return;
    }

    // Validate URLs
    const invalidUrls = validUrls.filter(url => {
      try {
        new URL(url);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      toast({
        title: "Invalid URLs",
        description: "Please ensure all URLs are valid.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate(validUrls);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is available for Plus and Ultra subscribers. Paste LinkedIn job URLs below to import them to your saved jobs.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Add LinkedIn Job URLs</h2>
          <p className="text-sm text-muted-foreground">
            Enter one or more LinkedIn job posting URLs. We'll scrape the job details and add them to your list.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-3">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`url-${index}`} className="sr-only">
                    Job URL {index + 1}
                  </Label>
                  <Input
                    id={`url-${index}`}
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                  />
                </div>
                {urls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeUrlField(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addUrlField}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another URL
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="flex-1"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Import Jobs
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Copy the full URL of a LinkedIn job posting</p>
            <p>• You can import multiple jobs at once</p>
            <p>• Jobs will be saved to your "My Jobs" list</p>
          </div>
        </div>
      </div>

      {importedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Recently Imported Jobs
            </CardTitle>
            <CardDescription>
              These jobs have been added to your saved jobs list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importedJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.company || job.author}
                      </p>
                    </div>
                    <Badge variant="secondary">Saved</Badge>
                  </div>
                  {job.location && (
                    <p className="text-sm text-muted-foreground">
                      📍 {job.location}
                    </p>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    asChild
                  >
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                      View original posting
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">How to find LinkedIn job URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to LinkedIn.com and search for jobs</li>
            <li>Click on a job posting you're interested in</li>
            <li>Copy the URL from your browser's address bar</li>
            <li>Paste it here and click "Import Jobs"</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
