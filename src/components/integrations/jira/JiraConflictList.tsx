import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useJiraConflicts } from "@/hooks/useJiraConflicts";
import { JiraConflictResolverDialog, adfToText } from "./JiraConflictResolverDialog";
import { AlertTriangle, GitMerge, ExternalLink, RefreshCw } from "lucide-react";

interface JiraConflictListProps {
  workspaceId: string | undefined;
  projectId: string | undefined;
}

export function JiraConflictList({ workspaceId, projectId }: JiraConflictListProps) {
  const { data: conflicts, isLoading, refetch, isRefetching } = useJiraConflicts(workspaceId, projectId);
  const [selectedConflict, setSelectedConflict] = useState<{
    mappingId: string;
    workspaceId: string;
    jiraIssueKey: string;
    jiraIssueUrl: string;
    artifact: {
      id: string;
      title: string;
      type: string;
      content_markdown: string | null;
      short_id: string;
    };
    jira: {
      summary: string;
      description: string;
    };
  } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Sync Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Sync Conflicts
          </CardTitle>
          <CardDescription>
            No conflicts detected between OneTrace and Jira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitMerge className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>All artifacts are in sync with Jira</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleOpenResolver = (conflict: typeof conflicts[0]) => {
    setSelectedConflict({
      mappingId: conflict.id,
      workspaceId: workspaceId!,
      jiraIssueKey: conflict.jira_issue_key,
      jiraIssueUrl: conflict.jira_issue_url,
      artifact: conflict.artifact,
      jira: {
        summary: conflict.shadow?.summary || "",
        description: conflict.shadow?.description_adf 
          ? adfToText(conflict.shadow.description_adf) 
          : "",
      },
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Sync Conflicts
                <Badge variant="destructive" className="ml-2">
                  {conflicts.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                These artifacts have changes in both OneTrace and Jira that need resolution
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {conflict.artifact.short_id}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {conflict.artifact.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={conflict.jira_issue_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {conflict.jira_issue_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-xs text-muted-foreground">
                          • Detected{" "}
                          {conflict.conflict_detected_at
                            ? new Date(conflict.conflict_detected_at).toLocaleDateString()
                            : "recently"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenResolver(conflict)}
                  >
                    <GitMerge className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <JiraConflictResolverDialog
        open={!!selectedConflict}
        onOpenChange={(open) => !open && setSelectedConflict(null)}
        conflict={selectedConflict}
      />
    </>
  );
}
