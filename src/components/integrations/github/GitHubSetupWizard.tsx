import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Search,
  GitBranch,
  Lock,
  Globe,
  Check,
  ExternalLink,
} from "lucide-react";
import { useGitHubRepos, GitHubRepo } from "@/hooks/useGitHubConnection";
import { useCreateRepoLink } from "@/hooks/useGitHubRepoLinks";

interface GitHubSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  workspaceId: string;
  projectId: string;
  onComplete: () => void;
}

export function GitHubSetupWizard({
  open,
  onOpenChange,
  connectionId,
  workspaceId,
  projectId,
  onComplete,
}: GitHubSetupWizardProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  const { data: repoData, isLoading } = useGitHubRepos(connectionId, workspaceId, {
    search: debouncedSearch,
  });
  const createLink = useCreateRepoLink();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleLink = async () => {
    if (!selectedRepo) return;
    await createLink.mutateAsync({
      connectionId,
      workspaceId,
      projectId,
      repoFullName: selectedRepo.full_name,
      repoName: selectedRepo.name,
      repoOwner: selectedRepo.owner,
      repoUrl: selectedRepo.html_url,
      defaultBranch: selectedRepo.default_branch,
    });
    onComplete();
    onOpenChange(false);
    setSelectedRepo(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link GitHub Repository</DialogTitle>
          <DialogDescription>
            Select a repository to link to this project for commit & PR tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-72 border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !repoData?.repos?.length ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {debouncedSearch ? "No repositories found" : "No repositories available"}
              </div>
            ) : (
              <div className="divide-y">
                {repoData.repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      selectedRepo?.id === repo.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {repo.full_name}
                          </span>
                          {repo.private ? (
                            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {repo.default_branch}
                          </span>
                          {repo.language && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {repo.language}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedRepo?.id === repo.id && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedRepo && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-medium text-foreground">{selectedRepo.full_name}</span>
              </div>
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedRepo || createLink.isPending}
            >
              {createLink.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Link Repository
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
