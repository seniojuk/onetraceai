import { useState } from "react";
import { 
  Settings2, 
  ArrowRightLeft, 
  CheckCircle2, 
  Unlink, 
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { JiraConnection, JiraProjectLink, useJiraDisconnect, useJiraRefreshToken } from "@/hooks/useJiraConnection";
import { useUpdateJiraProjectLink } from "@/hooks/useJiraProjectLinkMutations";
import { JiraStatusMappingEditor } from "./JiraStatusMappingEditor";
import { JiraSyncSettingsEditor } from "./JiraSyncSettingsEditor";
import { cn } from "@/lib/utils";

interface JiraConfigurationPanelProps {
  connection: JiraConnection;
  projectLink: JiraProjectLink | null;
  workspaceId: string;
  onDisconnected?: () => void;
}

export function JiraConfigurationPanel({
  connection,
  projectLink,
  workspaceId,
  onDisconnected,
}: JiraConfigurationPanelProps) {
  const [statusMappingOpen, setStatusMappingOpen] = useState(false);
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);

  const disconnect = useJiraDisconnect();
  const refreshToken = useJiraRefreshToken();
  const updateProjectLink = useUpdateJiraProjectLink();

  const handleDisconnect = async () => {
    await disconnect.mutateAsync({
      connectionId: connection.id,
      workspaceId,
    });
    onDisconnected?.();
  };

  const handleRefreshToken = async () => {
    await refreshToken.mutateAsync({
      connectionId: connection.id,
      workspaceId,
    });
  };

  const handleStatusMappingChange = async (newMapping: Record<string, string>) => {
    if (!projectLink) return;
    await updateProjectLink.mutateAsync({
      projectLinkId: projectLink.id,
      updates: { status_mapping: newMapping },
    });
  };

  const handleSyncSettingsChange = async (newSettings: Record<string, boolean>) => {
    if (!projectLink) return;
    await updateProjectLink.mutateAsync({
      projectLinkId: projectLink.id,
      updates: { sync_settings: newSettings },
    });
  };

  const getStatusBadge = () => {
    switch (connection.status) {
      case "connected":
        return (
          <Badge className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Degraded
          </Badge>
        );
      case "broken":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Broken
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">Disconnected</Badge>
        );
    }
  };

  const tokenExpiresAt = connection.token_expires_at 
    ? new Date(connection.token_expires_at) 
    : null;
  const isTokenExpiringSoon = tokenExpiresAt && tokenExpiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
                alt="Jira"
                className="w-8 h-8 rounded"
              />
              <div>
                <CardTitle className="text-lg">Jira Cloud</CardTitle>
                <CardDescription>
                  {connection.jira_site_name || connection.jira_base_url}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Site URL</span>
              <a 
                href={connection.jira_base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:underline"
              >
                {connection.jira_base_url.replace('https://', '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              <span className="text-muted-foreground">Last Sync</span>
              <p className="text-foreground">
                {connection.last_successful_sync 
                  ? new Date(connection.last_successful_sync).toLocaleString()
                  : "Never"}
              </p>
            </div>
            {tokenExpiresAt && (
              <div>
                <span className="text-muted-foreground">Token Expires</span>
                <p className={cn("text-foreground", isTokenExpiringSoon && "text-warning")}>
                  {tokenExpiresAt.toLocaleString()}
                  {isTokenExpiringSoon && " (soon)"}
                </p>
              </div>
            )}
            {connection.last_error_message && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Last Error</span>
                <p className="text-destructive text-xs">{connection.last_error_message}</p>
              </div>
            )}
          </div>

          {/* Connection Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshToken}
              disabled={refreshToken.isPending}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", refreshToken.isPending && "animate-spin")} />
              Refresh Token
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Unlink className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Jira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the Jira connection and all project links for this workspace. 
                    Existing issue mappings will be preserved but sync will stop.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Project Link Settings */}
      {projectLink && (
        <>
          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Project: {projectLink.jira_project_name || projectLink.jira_project_key}
            </h3>
            <p className="text-xs text-muted-foreground">
              Linked to Jira project <strong>{projectLink.jira_project_key}</strong>
            </p>
          </div>

          {/* Status Mapping Collapsible */}
          <Collapsible open={statusMappingOpen} onOpenChange={setStatusMappingOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base">Status Mapping</CardTitle>
                    </div>
                    {statusMappingOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <JiraStatusMappingEditor
                    statusMapping={projectLink.status_mapping as Record<string, string>}
                    onChange={handleStatusMappingChange}
                    isLoading={updateProjectLink.isPending}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Sync Settings Collapsible */}
          <Collapsible open={syncSettingsOpen} onOpenChange={setSyncSettingsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base">Sync Settings</CardTitle>
                    </div>
                    {syncSettingsOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <JiraSyncSettingsEditor
                    syncSettings={projectLink.sync_settings as Record<string, boolean>}
                    onChange={handleSyncSettingsChange}
                    isLoading={updateProjectLink.isPending}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Traceability Mode Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Traceability Mode</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {projectLink.field_mode === "custom_fields" ? "Custom Fields" : "Issue Properties"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {projectLink.field_mode === "custom_fields"
                      ? "Traceability data stored in visible Jira custom fields"
                      : "Traceability data stored in hidden issue properties"}
                  </p>
                </div>
                <Badge variant="secondary">
                  {projectLink.field_mode === "custom_fields" ? "Recommended" : "Fallback"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Project Link */}
      {!projectLink && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No Jira project linked to this OneTrace project yet.
            </p>
            <Button variant="outline">
              Link Jira Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
