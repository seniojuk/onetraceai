import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  GitBranch,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  Link2,
} from "lucide-react";
import { GitHubConnection, useGitHubPullCommits, useGitHubPullPRs, useGitHubLinkArtifacts } from "@/hooks/useGitHubConnection";
import { useGitHubRepoLinks, useDeleteRepoLink, GitHubRepoLink } from "@/hooks/useGitHubRepoLinks";
import { GitHubSetupWizard } from "./GitHubSetupWizard";

interface GitHubConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: GitHubConnection;
  workspaceId: string;
  projectId: string | undefined;
  onDisconnect: () => void;
}

export function GitHubConfigPanel({
  open,
  onOpenChange,
  connection,
  workspaceId,
  projectId,
  onDisconnect,
}: GitHubConfigPanelProps) {
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [syncingLinkId, setSyncingLinkId] = useState<string | null>(null);

  const { data: repoLinks = [], isLoading: linksLoading, refetch: refetchLinks } = useGitHubRepoLinks(projectId);
  const deleteLink = useDeleteRepoLink();
  const pullCommits = useGitHubPullCommits();
  const pullPRs = useGitHubPullPRs();
  const linkArtifacts = useGitHubLinkArtifacts();

  const handleSync = async (link: GitHubRepoLink) => {
    if (!projectId) return;
    setSyncingLinkId(link.id);
    try {
      await Promise.all([
        pullCommits.mutateAsync({ repoLinkId: link.id, workspaceId, projectId }),
        pullPRs.mutateAsync({ repoLinkId: link.id, workspaceId, projectId }),
      ]);
    } finally {
      setSyncingLinkId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>GitHub Configuration</DialogTitle>
            <DialogDescription>
              Manage your GitHub connection and linked repositories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Connection info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
              {connection.github_avatar_url && (
                <img
                  src={connection.github_avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {connection.github_username || "GitHub Account"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected {connection.created_at ? new Date(connection.created_at).toLocaleDateString() : ""}
                </p>
              </div>
              <Badge
                className={
                  connection.status === "connected"
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-warning/10 text-warning border-warning/30"
                }
              >
                {connection.status}
              </Badge>
            </div>

            <Separator />

            {/* Linked repos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">Linked Repositories</h3>
                <Button size="sm" variant="outline" onClick={() => setShowRepoPicker(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Repo
                </Button>
              </div>

              {linksLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : repoLinks.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No repositories linked yet. Add one to start syncing commits & PRs.
                </div>
              ) : (
                <div className="space-y-2">
                  {repoLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {link.repo_full_name}
                          </span>
                          {link.repo_url && (
                            <a
                              href={link.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {link.default_branch || "main"}
                          {link.last_pull_at && (
                            <span> · Last synced {new Date(link.last_pull_at).toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Sync commits & PRs"
                          onClick={() => handleSync(link)}
                          disabled={syncingLinkId === link.id}
                        >
                          {syncingLinkId === link.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Link artifacts from refs"
                          onClick={() => {
                            if (!projectId) return;
                            linkArtifacts.mutate({ repoLinkId: link.id, workspaceId, projectId });
                          }}
                          disabled={linkArtifacts.isPending}
                        >
                          {linkArtifacts.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteLink.mutate(link.id)}
                          disabled={deleteLink.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button variant="destructive" size="sm" onClick={onDisconnect}>
                Disconnect GitHub
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {projectId && (
        <GitHubSetupWizard
          open={showRepoPicker}
          onOpenChange={setShowRepoPicker}
          connectionId={connection.id}
          workspaceId={workspaceId}
          projectId={projectId}
          onComplete={() => refetchLinks()}
        />
      )}
    </>
  );
}
