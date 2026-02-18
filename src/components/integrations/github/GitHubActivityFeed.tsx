import { useState } from "react";
import {
  GitCommit,
  GitPullRequest,
  GitMerge,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
  FileCode,
  Tag,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitHubCommits, useGitHubPRs, GitHubCommit, GitHubPR } from "@/hooks/useGitHubActivity";
import { GitHubRepoLink } from "@/hooks/useGitHubRepoLinks";
import { cn } from "@/lib/utils";

interface GitHubActivityFeedProps {
  projectId: string;
  repoLinks: GitHubRepoLink[];
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function ArtifactRefBadge({ ref }: { ref: string }) {
  return (
    <Badge
      variant="secondary"
      className="text-xs font-mono px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20"
    >
      <Tag className="w-2.5 h-2.5 mr-1" />
      {ref}
    </Badge>
  );
}

function CommitRow({ commit }: { commit: GitHubCommit }) {
  const [expanded, setExpanded] = useState(false);
  const firstLine = commit.commit_message?.split("\n")[0] ?? "(no message)";
  const rest = commit.commit_message?.split("\n").slice(1).join("\n").trim();
  const hasRefs = (commit.parsed_artifact_refs?.length ?? 0) > 0;

  return (
    <div className="group py-3 px-4 hover:bg-muted/40 transition-colors rounded-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground leading-snug truncate">
              {firstLine}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(commit.committed_at)}
              </span>
              {commit.commit_url && (
                <a
                  href={commit.commit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <code className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
              {shortSha(commit.commit_sha)}
            </code>
            {commit.author_login && (
              <span className="text-xs text-muted-foreground">
                by <span className="text-foreground">{commit.author_login}</span>
              </span>
            )}
            {(commit.additions != null || commit.deletions != null) && (
              <div className="flex items-center gap-1 text-xs">
                {commit.additions != null && commit.additions > 0 && (
                  <span className="text-success flex items-center gap-0.5">
                    <Plus className="w-2.5 h-2.5" />
                    {commit.additions}
                  </span>
                )}
                {commit.deletions != null && commit.deletions > 0 && (
                  <span className="text-destructive flex items-center gap-0.5">
                    <Minus className="w-2.5 h-2.5" />
                    {commit.deletions}
                  </span>
                )}
                {commit.files_changed != null && (
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <FileCode className="w-2.5 h-2.5" />
                    {commit.files_changed} file{commit.files_changed !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {hasRefs && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {commit.parsed_artifact_refs!.map((ref) => (
                <ArtifactRefBadge key={ref} ref={ref} />
              ))}
            </div>
          )}

          {rest && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {expanded ? "Show less" : "Show more"}
              </button>
              {expanded && (
                <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                  {rest}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PRStatusBadge({ state, mergedAt }: { state: string | null; mergedAt: string | null }) {
  if (mergedAt) {
    return (
      <Badge className="bg-accent text-accent-foreground border-border text-xs">
        <GitMerge className="w-3 h-3 mr-1" />
        Merged
      </Badge>
    );
  }
  if (state === "open") {
    return (
      <Badge className="bg-success/10 text-success border-success/20 text-xs">
        <GitPullRequest className="w-3 h-3 mr-1" />
        Open
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
      <GitPullRequest className="w-3 h-3 mr-1" />
      Closed
    </Badge>
  );
}

function PRRow({ pr }: { pr: GitHubPR }) {
  const hasRefs = (pr.parsed_artifact_refs?.length ?? 0) > 0;
  const isMerged = !!pr.merged_at;

  return (
    <div className="group py-3 px-4 hover:bg-muted/40 transition-colors rounded-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              isMerged
                ? "bg-accent"
                : pr.pr_state === "open"
                ? "bg-success/10"
                : "bg-muted"
            )}
          >
            {isMerged ? (
              <GitMerge className="w-3.5 h-3.5 text-accent-foreground" />
            ) : (
              <GitPullRequest
                className={cn(
                  "w-3.5 h-3.5",
                  pr.pr_state === "open" ? "text-success" : "text-muted-foreground"
                )}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug truncate">
                {pr.pr_title ?? "(no title)"}
              </p>
              <PRStatusBadge state={pr.pr_state} mergedAt={pr.merged_at} />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(pr.pr_created_at)}
              </span>
              {pr.pr_url && (
                <a
                  href={pr.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">#{pr.pr_number}</span>
            {pr.author_login && (
              <span className="text-xs text-muted-foreground">
                by <span className="text-foreground">{pr.author_login}</span>
              </span>
            )}
            {pr.head_branch && pr.base_branch && (
              <span className="text-xs text-muted-foreground font-mono">
                <span className="text-foreground">{pr.head_branch}</span>
                {" → "}
                <span className="text-foreground">{pr.base_branch}</span>
              </span>
            )}
          </div>

          {hasRefs && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {pr.parsed_artifact_refs!.map((ref) => (
                <ArtifactRefBadge key={ref} ref={ref} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-2 py-3">
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GitHubActivityFeed({ projectId, repoLinks }: GitHubActivityFeedProps) {
  const [selectedRepoId, setSelectedRepoId] = useState<string>("all");
  const [prStateFilter, setPrStateFilter] = useState<string>("all");

  const repoLinkId = selectedRepoId === "all" ? undefined : selectedRepoId;

  const { data: commits = [], isLoading: commitsLoading } = useGitHubCommits(projectId, {
    repoLinkId,
    limit: 50,
  });

  const { data: prs = [], isLoading: prsLoading } = useGitHubPRs(projectId, {
    repoLinkId,
    limit: 50,
    state: prStateFilter === "all" ? undefined : prStateFilter,
  });

  const hasMultipleRepos = repoLinks.length > 1;

  return (
    <div className="rounded-lg border bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">GitHub Activity</span>
          {repoLinks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {repoLinks.length} repo{repoLinks.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {hasMultipleRepos && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
              <SelectTrigger className="h-7 text-xs w-[180px]">
                <SelectValue placeholder="All repositories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repositories</SelectItem>
                {repoLinks.map((link) => (
                  <SelectItem key={link.id} value={link.id}>
                    {link.repo_full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="commits">
        <div className="px-4 pt-2 border-b">
          <TabsList className="h-8 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="commits"
              className="h-8 px-0 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Commits
              {!commitsLoading && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1">
                  {commits.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="prs"
              className="h-8 px-0 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Pull Requests
              {!prsLoading && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1">
                  {prs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Commits Tab */}
        <TabsContent value="commits" className="mt-0">
          {commitsLoading ? (
            <FeedSkeleton />
          ) : commits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <GitCommit className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground">No commits yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sync a repository to see commit activity here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="p-2 space-y-0.5">
                {commits.map((commit) => (
                  <CommitRow key={commit.id} commit={commit} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* PRs Tab */}
        <TabsContent value="prs" className="mt-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <div className="flex gap-1">
              {["all", "open", "closed"].map((state) => (
                <Button
                  key={state}
                  variant={prStateFilter === state ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs capitalize"
                  onClick={() => setPrStateFilter(state)}
                >
                  {state === "all" ? "All" : state.charAt(0).toUpperCase() + state.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {prsLoading ? (
            <FeedSkeleton />
          ) : prs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <GitPullRequest className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground">No pull requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sync a repository to see pull request activity here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[380px]">
              <div className="p-2 space-y-0.5">
                {prs.map((pr) => (
                  <PRRow key={pr.id} pr={pr} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
