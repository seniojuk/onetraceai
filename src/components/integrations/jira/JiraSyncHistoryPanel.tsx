import { useState } from "react";
import { RefreshCw, ArrowUpCircle, ArrowDownCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JiraHealthStatus } from "./JiraHealthStatus";
import { JiraAuditLogTable } from "./JiraAuditLogTable";
import { JiraConflictList } from "./JiraConflictList";
import { useJiraPullSync } from "@/hooks/useJiraPull";
import { useJiraBulkPush } from "@/hooks/useJiraPush";

// Tooltip descriptions for section headings
const SECTION_TOOLTIPS = {
  quickActions: "Manually trigger sync operations between OneTrace and Jira. 'Pull from Jira' fetches the latest changes from Jira issues. 'Push All Changes' sends all pending OneTrace updates to Jira.",
  syncActivity: "View a chronological log of all sync operations between OneTrace and Jira, including pushes, pulls, and any errors that occurred during synchronization.",
  conflicts: "Lists any conflicts detected when both OneTrace and Jira have changes to the same data. Review and resolve these conflicts to ensure data consistency between systems.",
};

interface JiraSyncHistoryPanelProps {
  connectionId: string;
  workspaceId: string;
  projectId: string;
  projectLinkId?: string;
}

export function JiraSyncHistoryPanel({
  connectionId,
  workspaceId,
  projectId,
  projectLinkId,
}: JiraSyncHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState("activity");
  const pullSync = useJiraPullSync();
  const bulkPush = useJiraBulkPush();

  const handlePullSync = async () => {
    if (!projectLinkId) return;
    await pullSync.mutateAsync({ projectLinkId, workspaceId });
  };

  const handlePushAll = async () => {
    if (!projectLinkId) return;
    // For now, push all would need artifact IDs - this is a placeholder
    // In a full implementation, you'd query for all linked artifacts
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Health Status */}
        <JiraHealthStatus connectionId={connectionId} />

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{SECTION_TOOLTIPS.quickActions}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePullSync}
              disabled={pullSync.isPending || !projectLinkId}
            >
              {pullSync.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 mr-2" />
              )}
              Pull from Jira
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!projectLinkId}
              onClick={handlePushAll}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Push All Changes
            </Button>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity" className="flex items-center gap-1.5">
              Sync Activity
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{SECTION_TOOLTIPS.syncActivity}</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="flex items-center gap-1.5">
              Conflicts
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{SECTION_TOOLTIPS.conflicts}</p>
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            <JiraAuditLogTable workspaceId={workspaceId} projectId={projectId} />
          </TabsContent>
          <TabsContent value="conflicts" className="mt-4">
            <JiraConflictList projectId={projectId} workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
