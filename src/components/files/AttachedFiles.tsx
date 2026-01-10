import { useState } from "react";
import { File, Download, X, Plus, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFilesForArtifact,
  useFileArtifacts,
  useAssociateFile,
  useDisassociateFile,
  downloadFile,
  FileArtifact,
} from "@/hooks/useFileArtifacts";
import { FileUploader } from "./FileUploader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AttachedFilesProps {
  artifactId: string;
  projectId: string;
  workspaceId: string;
  isEditing?: boolean;
}

export function AttachedFiles({
  artifactId,
  projectId,
  workspaceId,
  isEditing = false,
}: AttachedFilesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const { data: attachedFiles, isLoading } = useFilesForArtifact(artifactId, projectId);
  const { data: allFiles } = useFileArtifacts(projectId);
  const associateFile = useAssociateFile();
  const disassociateFile = useDisassociateFile();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (file: FileArtifact) => {
    try {
      await downloadFile(file.content_json.storage_path, file.content_json.file_name);
      toast.success("File downloaded");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await disassociateFile.mutateAsync({
        fileArtifactId: fileId,
        associatedArtifactId: artifactId,
      });
      toast.success("File removed from artifact");
    } catch (error) {
      toast.error("Failed to remove file");
    }
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleAssociateSelected = async () => {
    try {
      for (const fileId of selectedFileIds) {
        await associateFile.mutateAsync({
          fileArtifactId: fileId,
          associatedArtifactId: artifactId,
          workspaceId,
          projectId,
        });
      }
      toast.success(`${selectedFileIds.size} file(s) attached`);
      setSelectedFileIds(new Set());
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error("Failed to attach files");
    }
  };

  // Filter out already attached files
  const availableFiles = allFiles?.filter(
    (file) => !attachedFiles?.some((attached) => attached.id === file.id)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Attached Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Attached Files
          </CardTitle>
          <CardDescription>
            Supporting documents for this artifact
          </CardDescription>
        </div>
        {isEditing && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Attach Files</DialogTitle>
                <DialogDescription>
                  Upload new files or select existing files from your project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={isUploadMode ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => setIsUploadMode(false)}
                  >
                    Select Existing
                  </Button>
                  <Button
                    variant={isUploadMode ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setIsUploadMode(true)}
                  >
                    Upload New
                  </Button>
                </div>

                {isUploadMode ? (
                  <FileUploader
                    workspaceId={workspaceId}
                    projectId={projectId}
                    associatedArtifactId={artifactId}
                    onUploadComplete={() => setIsAddDialogOpen(false)}
                  />
                ) : (
                  <>
                    {availableFiles && availableFiles.length > 0 ? (
                      <>
                        <ScrollArea className="h-[300px] border rounded-lg p-4">
                          <div className="space-y-2">
                            {availableFiles.map((file) => (
                              <div
                                key={file.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                  selectedFileIds.has(file.id)
                                    ? "bg-accent/10 border border-accent"
                                    : "bg-muted/50 hover:bg-muted"
                                )}
                                onClick={() => handleToggleFile(file.id)}
                              >
                                <Checkbox
                                  checked={selectedFileIds.has(file.id)}
                                  onCheckedChange={() => handleToggleFile(file.id)}
                                />
                                <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {file.content_json.file_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.content_json.file_size)} •{" "}
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAssociateSelected}
                            disabled={selectedFileIds.size === 0 || associateFile.isPending}
                            className="bg-accent hover:bg-accent/90"
                          >
                            {associateFile.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Attach {selectedFileIds.size} File(s)
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No files available. Upload new files first.
                        </p>
                        <Button variant="outline" onClick={() => setIsUploadMode(true)}>
                          Upload New Files
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {attachedFiles && attachedFiles.length > 0 ? (
          <div className="space-y-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.content_json.file_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.content_json.file_size)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {file.content_json.file_type.split("/")[1]?.toUpperCase() || "FILE"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No files attached yet.
            {isEditing && " Click 'Add Files' to attach supporting documents."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
