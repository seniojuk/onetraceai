import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JiraConnection, JiraProjectLink } from "@/hooks/useJiraConnection";
import { JiraConfigurationPanel } from "./JiraConfigurationPanel";

interface JiraConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: JiraConnection;
  projectLink: JiraProjectLink | null;
  workspaceId: string;
  onDisconnected?: () => void;
}

export function JiraConfigurationDialog({
  open,
  onOpenChange,
  connection,
  projectLink,
  workspaceId,
  onDisconnected,
}: JiraConfigurationDialogProps) {
  const handleDisconnected = () => {
    onDisconnected?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Jira Integration Settings</DialogTitle>
          <DialogDescription>
            Manage your Jira connection, project mappings, and sync settings.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <JiraConfigurationPanel
            connection={connection}
            projectLink={projectLink}
            workspaceId={workspaceId}
            onDisconnected={handleDisconnected}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
