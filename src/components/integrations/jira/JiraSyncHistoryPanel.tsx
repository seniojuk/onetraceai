import { useState } from "react";
import { RefreshCw, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JiraHealthStatus } from "./JiraHealthStatus";
import { JiraAuditLogTable } from "./JiraAuditLogTable";
import { JiraConflictList } from "./JiraConflictList";
import { useJiraPullSync } from "@/hooks/useJiraPull";
import { useJiraBulkPush } from "@/hooks/useJiraPush";

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
    <div className="space-y-6">
      {/* Health Status */}
      <JiraHealthStatus connectionId={connectionId} />

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
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
          <TabsTrigger value="activity">Sync Activity</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-4">
          <JiraAuditLogTable workspaceId={workspaceId} projectId={projectId} />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-4">
          <JiraConflictList projectId={projectId} workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
