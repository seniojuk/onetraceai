import { useState } from "react";
import { 
  Building2,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Crown,
  Shield,
  User,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  useWorkspaces, 
  useUpdateWorkspace, 
  useDeleteWorkspace,
  useWorkspaceMembers,
  type Workspace,
  type WorkspaceMember,
} from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

const roleIcons: Record<string, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
};

const roleColors: Record<string, string> = {
  OWNER: "text-yellow-600 bg-yellow-100",
  ADMIN: "text-purple-600 bg-purple-100",
  MEMBER: "text-blue-600 bg-blue-100",
  VIEWER: "text-gray-600 bg-gray-100",
};

interface WorkspaceItemProps {
  workspace: Workspace;
  userRole: string | null;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
}

function WorkspaceItem({ workspace, userRole, onEdit, onDelete }: WorkspaceItemProps) {
  const isOwner = userRole === "OWNER";
  const isAdmin = userRole === "ADMIN";
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner;

  const RoleIcon = roleIcons[userRole || "VIEWER"] || User;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="p-2 rounded-lg bg-accent/10">
        <Building2 className="w-5 h-5 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{workspace.name}</span>
          {workspace.slug && (
            <Badge variant="outline" className="text-xs">
              {workspace.slug}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={`text-xs ${roleColors[userRole || "VIEWER"] || ""}`}>
            <RoleIcon className="w-3 h-3 mr-1" />
            {userRole}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(workspace)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(workspace)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceManagement() {
  const { user } = useAuth();
  const { data: workspaces, isLoading } = useWorkspaces();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState<Workspace | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [editForm, setEditForm] = useState({ name: "", slug: "" });

  // Get user's role for each workspace
  const getUserRole = (workspace: Workspace): string | null => {
    // For now, if user created the workspace, they're the owner
    // In a more complete implementation, we'd fetch the member role
    if (workspace.created_by === user?.id) return "OWNER";
    return "MEMBER"; // Default assumption
  };

  const handleEdit = (workspace: Workspace) => {
    setEditForm({
      name: workspace.name,
      slug: workspace.slug || "",
    });
    setEditingWorkspace(workspace);
  };

  const handleSaveEdit = async () => {
    if (!editingWorkspace) return;
    
    try {
      await updateWorkspace.mutateAsync({
        workspaceId: editingWorkspace.id,
        name: editForm.name,
        slug: editForm.slug,
      });
      toast.success("Workspace updated successfully");
      setEditingWorkspace(null);
    } catch (error) {
      toast.error("Failed to update workspace", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteWorkspaceConfirm) return;
    if (confirmDeleteName !== deleteWorkspaceConfirm.name) {
      toast.error("Please type the workspace name exactly to confirm");
      return;
    }
    
    try {
      await deleteWorkspace.mutateAsync({
        workspaceId: deleteWorkspaceConfirm.id,
      });
      toast.success("Workspace deleted permanently");
      setDeleteWorkspaceConfirm(null);
      setConfirmDeleteName("");
    } catch (error) {
      toast.error("Failed to delete workspace", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>Manage your workspaces</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            Workspaces
          </CardTitle>
          <CardDescription>
            Manage workspaces you own or administer. Owners can edit and delete workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!workspaces?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No workspaces found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <WorkspaceItem
                    key={workspace.id}
                    workspace={workspace}
                    userRole={getUserRole(workspace)}
                    onEdit={handleEdit}
                    onDelete={setDeleteWorkspaceConfirm}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update the workspace details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-slug">Slug (URL identifier)</Label>
              <Input
                id="workspace-slug"
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="my-workspace"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkspace(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkspaceConfirm} onOpenChange={(open) => {
        if (!open) {
          setDeleteWorkspaceConfirm(null);
          setConfirmDeleteName("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Workspace Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete the workspace
                <strong className="mx-1">{deleteWorkspaceConfirm?.name}</strong>
                and ALL of its projects, artifacts, and associated data.
              </p>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-name" className="text-foreground">
                  Type <strong>{deleteWorkspaceConfirm?.name}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmDeleteName}
                  onChange={(e) => setConfirmDeleteName(e.target.value)}
                  placeholder="Enter workspace name"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteWorkspace.isPending || confirmDeleteName !== deleteWorkspaceConfirm?.name}
            >
              {deleteWorkspace.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
