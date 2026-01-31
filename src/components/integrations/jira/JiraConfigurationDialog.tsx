import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JiraConnection, JiraProjectLink } from "@/hooks/useJiraConnection";
import { JiraConfigurationPanel } from "./JiraConfigurationPanel";
import { JiraSyncHistoryPanel } from "./JiraSyncHistoryPanel";
import { JiraWorkspaceProjectLinks } from "./JiraWorkspaceProjectLinks";
import { useCurrentUserRole } from "@/hooks/useWorkspaces";

interface JiraConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: JiraConnection;
  projectLink: JiraProjectLink | null;
  workspaceId: string;
  projectId?: string;
  onDisconnected?: () => void;
  onLinkProject?: () => void;
}

export function JiraConfigurationDialog({
  open,
  onOpenChange,
  connection,
  projectLink,
  workspaceId,
  projectId,
  onDisconnected,
  onLinkProject,
}: JiraConfigurationDialogProps) {
  const userRole = useCurrentUserRole(workspaceId);
  const isAdminOrOwner = userRole === "OWNER" || userRole === "ADMIN";

  const handleDisconnected = () => {
    onDisconnected?.();
    onOpenChange(false);
  };

  const handleLinkProject = () => {
    onOpenChange(false);
    onLinkProject?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Jira Integration Settings</DialogTitle>
          <DialogDescription>
            Manage your Jira connection, project mappings, and sync settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className={`grid w-full ${isAdminOrOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity & Health</TabsTrigger>
            {isAdminOrOwner && (
              <TabsTrigger value="all-projects">All Projects</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="settings" className="mt-4">
            <ScrollArea className="max-h-[calc(85vh-180px)] pr-4">
              <JiraConfigurationPanel
                connection={connection}
                projectLink={projectLink}
                workspaceId={workspaceId}
                onDisconnected={handleDisconnected}
                onLinkProject={handleLinkProject}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="max-h-[calc(85vh-180px)] pr-4">
              {projectId ? (
                <JiraSyncHistoryPanel
                  connectionId={connection.id}
                  workspaceId={workspaceId}
                  projectId={projectId}
                  projectLinkId={projectLink?.id}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select a project to view sync activity</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          {isAdminOrOwner && (
            <TabsContent value="all-projects" className="mt-4">
              <ScrollArea className="max-h-[calc(85vh-180px)] pr-4">
                <JiraWorkspaceProjectLinks workspaceId={workspaceId} />
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
