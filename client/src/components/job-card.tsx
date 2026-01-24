import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  MessageSquare, 
  Clock,
  MapPin,
  DollarSign
} from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";
import type { JobPost } from "@shared/schema";

interface JobCardProps {
  job: JobPost;
  onSave: (jobId: string) => void;
  onGenerateMessage: (job: JobPost) => void;
}

const sourceIcons = {
  reddit: SiReddit,
  x: () => <span className="font-bold text-sm">𝕏</span>,
  facebook: SiFacebook,
};

const sourceColors = {
  reddit: "text-orange-500",
  x: "text-foreground",
  facebook: "text-blue-500",
};

export function JobCard({ job, onSave, onGenerateMessage }: JobCardProps) {
  const SourceIcon = sourceIcons[job.source];

  return (
    <Card className="hover-elevate" data-testid={`job-card-${job.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className={`flex items-center gap-1 ${sourceColors[job.source]}`}>
                <SourceIcon className="w-4 h-4" />
              </div>
              <span className="text-sm text-muted-foreground">@{job.authorHandle || job.author}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {job.postedAt}
              </span>
            </div>
            <h3 className="font-semibold text-base line-clamp-2" data-testid={`job-title-${job.id}`}>
              {job.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSave(job.id)}
            data-testid={`button-save-job-${job.id}`}
          >
            {job.saved ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4" data-testid={`job-description-${job.id}`}>
          {job.description}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
          {job.budget && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {job.budget}
            </span>
          )}
          {job.isRemote && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Remote
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {job.matchedSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs" data-testid={`job-skill-${job.id}-${skill}`}>
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t gap-2 flex-wrap">
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={() => onGenerateMessage(job)}
          data-testid={`button-generate-message-${job.id}`}
        >
          <MessageSquare className="w-4 h-4" />
          Generate Message
        </Button>
        <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5" data-testid={`button-view-post-${job.id}`}>
            <ExternalLink className="w-4 h-4" />
            View Post
          </Button>
        </a>
        {job.applied && (
          <Badge variant="outline" className="text-primary border-primary">
            Applied
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
