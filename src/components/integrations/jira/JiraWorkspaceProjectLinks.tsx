import { useState } from "react";
import { 
  ExternalLink, 
  Unlink, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  useWorkspaceJiraProjectLinks, 
  useUnlinkJiraProject,
  JiraProjectLinkWorkspaceView 
} from "@/hooks/useWorkspaceJiraProjectLinks";
import { useCurrentUserRole } from "@/hooks/useWorkspaces";
import { cn } from "@/lib/utils";

interface JiraWorkspaceProjectLinksProps {
  workspaceId: string;
  onSelectProject?: (projectId: string) => void;
}

export function JiraWorkspaceProjectLinks({ 
  workspaceId,
  onSelectProject 
}: JiraWorkspaceProjectLinksProps) {
  const { data: projectLinks, isLoading } = useWorkspaceJiraProjectLinks(workspaceId);
  const userRole = useCurrentUserRole(workspaceId);
  const unlinkProject = useUnlinkJiraProject();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  const handleUnlink = async (link: JiraProjectLinkWorkspaceView) => {
    setUnlinkingId(link.id);
    try {
      await unlinkProject.mutateAsync({ projectLinkId: link.id });
    } finally {
      setUnlinkingId(null);
    }
  };

  const getSyncStatusBadge = (link: JiraProjectLinkWorkspaceView) => {
    const lastPush = link.last_push_at ? new Date(link.last_push_at) : null;
    const lastPull = link.last_pull_at ? new Date(link.last_pull_at) : null;
    const lastActivity = lastPush && lastPull 
      ? (lastPush > lastPull ? lastPush : lastPull)
      : lastPush || lastPull;

    if (!lastActivity) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Never Synced
        </Badge>
      );
    }

    const pushFailed = link.last_push_status === "error";
    const pullFailed = link.last_pull_status === "error";

    if (pushFailed || pullFailed) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Sync Error
        </Badge>
      );
    }

    return (
      <Badge className="bg-success/10 text-success border-success/30 text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Synced
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked Projects</CardTitle>
          <CardDescription>All Jira project links in this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projectLinks || projectLinks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground mb-1">No Project Links</h3>
          <p className="text-sm text-muted-foreground">
            No OneTrace projects are linked to Jira in this workspace yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Linked Projects ({projectLinks.length})
        </CardTitle>
        <CardDescription>
          All Jira project links using this workspace's connection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OneTrace Project</TableHead>
              <TableHead>Jira Project</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectLinks.map((link) => {
              const lastActivity = link.last_push_at || link.last_pull_at;
              return (
                <TableRow 
                  key={link.id}
                  className={cn(
                    onSelectProject && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onSelectProject?.(link.project_id)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{link.project_name}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        ({link.project_key})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://${link.jira_project_key}.atlassian.net`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {link.jira_project_name || link.jira_project_key}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {link.issue_mappings_count} mapped
                    </Badge>
                  </TableCell>
                  <TableCell>{getSyncStatusBadge(link)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lastActivity 
                      ? new Date(lastActivity).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={unlinkingId === link.id}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unlink Jira Project?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the link between <strong>{link.project_name}</strong> and 
                              Jira project <strong>{link.jira_project_key}</strong>. 
                              Existing issue mappings will be deleted and sync will stop.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleUnlink(link)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {unlinkingId === link.id ? "Unlinking..." : "Unlink"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
