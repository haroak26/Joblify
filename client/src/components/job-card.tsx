import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  Wand2, 
  Clock,
  MapPin,
  DollarSign
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import type { JobPost } from "@shared/schema";

interface JobCardProps {
  job: JobPost;
  onSave: (jobId: string) => void;
  onApply: (jobId: string) => void;
  onGenerateMessage: (job: JobPost) => void;
}

const sourceIcons = {
  reddit: SiReddit,
  x: () => <span className="font-bold text-base">𝕏</span>,
  facebook: SiFacebook,
};

const sourceColors = {
  reddit: "text-orange-500",
  x: "text-foreground",
  facebook: "text-blue-600",
};

const sourceBgColors = {
  reddit: "bg-orange-500/10",
  x: "bg-muted",
  facebook: "bg-blue-600/10",
};

export function JobCard({ job, onSave, onApply, onGenerateMessage }: JobCardProps) {
  const [, setLocation] = useLocation();
  const SourceIcon = sourceIcons[job.source];

  const handleGenerateClick = () => {
    onGenerateMessage(job);
  };

  const handleOpenDetails = () => {
    setLocation(`/dashboard/jobs/${job.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDetails();
    }
  };

  return (
    <Card
      className="hover-elevate overflow-visible border-sidebar-border/50 shadow-sm cursor-pointer transition-transform"
      data-testid={`job-card-${job.id}`}
      onClick={handleOpenDetails}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sourceBgColors[job.source]}`}>
                <SourceIcon className={`w-3.5 h-3.5 ${sourceColors[job.source]}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{job.source}</span>
              </div>
              {job.relevanceScore !== undefined && job.relevanceScore > 0 && (
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] h-5 px-1.5 font-bold">
                  {job.relevanceScore}% MATCH
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">@{job.authorHandle || job.author}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {job.postedAt}
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight line-clamp-2" data-testid={`job-title-${job.id}`}>
              {job.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              onSave(job.id);
            }}
            className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-sidebar-accent"
            data-testid={`button-save-job-${job.id}`}
          >
            {job.saved ? (
              <BookmarkCheck className="w-5 h-5 text-primary" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 leading-relaxed" data-testid={`job-description-${job.id}`}>
          {job.description}
        </p>
        <div className="flex flex-wrap gap-4 text-[13px] text-muted-foreground mb-4">
          {job.budget && (
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <DollarSign className="w-4 h-4 text-primary" />
              {job.budget}
            </span>
          )}
          {job.isRemote && (
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4" />
              Remote
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {job.matchedSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="rounded-md px-2 py-0 h-5 text-[11px] font-medium" data-testid={`job-skill-${job.id}-${skill}`}>
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-sidebar-border/30 gap-3 flex-col sm:flex-row sm:items-center flex-wrap">
        <Button
          variant="default"
          size="sm"
          className="gap-2 h-9 px-4 font-medium w-full sm:w-auto justify-center"
          onClick={(event) => {
            event.stopPropagation();
            handleGenerateClick();
          }}
          data-testid={`button-generate-message-${job.id}`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Generate Message
        </Button>
        <Button
          variant={job.applied ? "secondary" : "default"}
          size="sm"
          disabled={job.applied}
          className="gap-2 h-9 px-4 font-medium w-full sm:w-auto justify-center"
          onClick={(event) => {
            event.stopPropagation();
            onApply(job.id);
          }}
          data-testid={`button-apply-${job.id}`}
        >
          {job.applied ? "Applied" : "Mark Applied"}
        </Button>
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="w-full sm:w-auto"
        >
          <Button variant="outline" size="sm" className="gap-2 h-9 px-4 font-medium w-full sm:w-auto justify-center" data-testid={`button-view-post-${job.id}`}>
            <ExternalLink className="w-3.5 h-3.5" />
            View Post
          </Button>
        </a>
        {job.applied && (
          <Badge variant="outline" className="text-primary border-primary rounded-md px-2 h-6 text-[11px] font-bold">
            APPLIED
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
