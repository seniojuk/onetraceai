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

interface JiraConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: JiraConnection;
  projectLink: JiraProjectLink | null;
  workspaceId: string;
  projectId?: string;
  onDisconnected?: () => void;
}

export function JiraConfigurationDialog({
  open,
  onOpenChange,
  connection,
  projectLink,
  workspaceId,
  projectId,
  onDisconnected,
}: JiraConfigurationDialogProps) {
  const handleDisconnected = () => {
    onDisconnected?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Jira Integration Settings</DialogTitle>
          <DialogDescription>
            Manage your Jira connection, project mappings, and sync settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity & Health</TabsTrigger>
          </TabsList>
          <TabsContent value="settings" className="mt-4">
            <ScrollArea className="max-h-[calc(85vh-180px)] pr-4">
              <JiraConfigurationPanel
                connection={connection}
                projectLink={projectLink}
                workspaceId={workspaceId}
                onDisconnected={handleDisconnected}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
