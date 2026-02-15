import { useState } from "react";
import { 
  Folder,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useProjects, useUpdateProject, useDeleteProject, type Project } from "@/hooks/useProjects";
import { useTechStackProfiles, useAssignTechStackToProject } from "@/hooks/useTechStackProfiles";
import { formatDistanceToNow } from "date-fns";

interface ProjectManagementProps {
  workspaceId: string;
  userRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;
}

export function ProjectManagement({ workspaceId, userRole }: ProjectManagementProps) {
  const [showArchived, setShowArchived] = useState(false);
  const { data: projects, isLoading } = useProjects(workspaceId, showArchived);
  const { data: stackProfiles } = useTechStackProfiles(workspaceId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const assignStack = useAssignTechStackToProject();

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", techStackProfileId: "" });

  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  
  const activeProjects = projects?.filter(p => p.status === "ACTIVE") || [];
  const archivedProjects = projects?.filter(p => p.status === "ARCHIVED") || [];

  const handleEdit = (project: Project) => {
    setEditForm({
      name: project.name,
      description: project.description || "",
      techStackProfileId: (project as any).tech_stack_profile_id || "",
    });
    setEditingProject(project);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    
    try {
      await updateProject.mutateAsync({
        projectId: editingProject.id,
        name: editForm.name,
        description: editForm.description,
      });
      // Assign tech stack if changed
      const currentStackId = (editingProject as any).tech_stack_profile_id || "";
      if (editForm.techStackProfileId !== currentStackId) {
        await assignStack.mutateAsync({
          projectId: editingProject.id,
          profileId: editForm.techStackProfileId || null,
        });
      }
      toast.success("Project updated successfully");
      setEditingProject(null);
    } catch (error) {
      toast.error("Failed to update project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleArchive = async (project: Project) => {
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        status: "ARCHIVED",
      });
      toast.success("Project archived");
    } catch (error) {
      toast.error("Failed to archive project");
    }
  };

  const handleRestore = async (project: Project) => {
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        status: "ACTIVE",
      });
      toast.success("Project restored");
    } catch (error) {
      toast.error("Failed to restore project");
    }
  };

  const handleDelete = async () => {
    if (!deleteProjectConfirm) return;
    
    try {
      await deleteProject.mutateAsync({
        projectId: deleteProjectConfirm.id,
        workspaceId,
      });
      toast.success("Project deleted permanently");
      setDeleteProjectConfirm(null);
    } catch (error) {
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Manage your workspace projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-accent" />
                Projects
              </CardTitle>
              <CardDescription>
                {canManage
                  ? "Manage, edit, or delete projects in this workspace"
                  : "View projects in this workspace"}
              </CardDescription>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
                  Show archived
                </Label>
                <Switch 
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!projects?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{showArchived ? "No projects in this workspace" : "No active projects in this workspace"}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {projects.map((project) => {
                  const isArchived = project.status === "ARCHIVED";
                  const projectStack = stackProfiles?.find((s) => s.id === (project as any).tech_stack_profile_id);
                  return (
                    <div
                      key={project.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors ${isArchived ? "opacity-60" : ""}`}
                    >
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Folder className="w-5 h-5 text-accent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{project.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.project_key}
                          </Badge>
                          {isArchived && (
                            <Badge variant="secondary" className="text-xs">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                          {projectStack && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {projectStack.name}
                            </span>
                          )}
                        </p>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(project)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {isArchived ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(project)}
                              title="Restore project"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(project)}
                              title="Archive project"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteProjectConfirm(project)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            {stackProfiles && stackProfiles.length > 0 && (
              <div className="space-y-2">
                <Label>Tech Stack Profile</Label>
                <Select
                  value={editForm.techStackProfileId || "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, techStackProfileId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tech stack..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {stackProfiles.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" />
                          {sp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Applied automatically during prompt/code generation
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateProject.isPending}>
              {updateProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProjectConfirm} onOpenChange={(open) => !open && setDeleteProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Project Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <strong className="mx-1">{deleteProjectConfirm?.name}</strong>
              and all its artifacts, versions, and associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
