import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { SiReddit, SiFacebook } from "react-icons/si";

export type SourceFilter = "all" | "reddit" | "x" | "facebook";
export type StatusFilter = "all" | "saved" | "applied";

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sourceFilter: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  jobCount: number;
}

export function JobFilters({
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceChange,
  statusFilter,
  onStatusChange,
  jobCount,
}: JobFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 text-base"
            data-testid="input-search-jobs"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={sourceFilter} onValueChange={(v: SourceFilter) => onSourceChange(v)}>
            <SelectTrigger className="w-40 h-11" data-testid="select-source">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="reddit">
                <div className="flex items-center gap-2">
                  <SiReddit className="w-4 h-4 text-orange-500" />
                  Reddit
                </div>
              </SelectItem>
              <SelectItem value="x">
                <div className="flex items-center gap-2">
                  <span className="font-bold">𝕏</span>
                  X (Twitter)
                </div>
              </SelectItem>
              <SelectItem value="facebook">
                <div className="flex items-center gap-2">
                  <SiFacebook className="w-4 h-4 text-blue-500" />
                  Facebook
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: StatusFilter) => onStatusChange(v)}>
            <SelectTrigger className="w-36 h-11" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="rounded-md px-3 py-1" data-testid="badge-job-count">
          {jobCount} {jobCount === 1 ? "job" : "jobs"} found
        </Badge>
        {sourceFilter !== "all" && (
          <Badge
            variant="secondary"
            className="cursor-pointer rounded-md px-3 py-1"
            onClick={() => onSourceChange("all")}
          >
            {sourceFilter === "reddit" && "Reddit"}
            {sourceFilter === "x" && "X"}
            {sourceFilter === "facebook" && "Facebook"}
            <span className="ml-1.5">×</span>
          </Badge>
        )}
        {statusFilter !== "all" && (
          <Badge
            variant="secondary"
            className="cursor-pointer rounded-md px-3 py-1"
            onClick={() => onStatusChange("all")}
          >
            {statusFilter === "saved" && "Saved"}
            {statusFilter === "applied" && "Applied"}
            <span className="ml-1.5">×</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
