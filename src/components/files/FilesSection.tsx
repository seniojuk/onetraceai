import { useState } from "react";
import { File, Download, Trash2, Link2, Search, Upload, Loader2, MoreVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useFileArtifacts,
  useDeleteFileArtifact,
  useArtifactsForFile,
  downloadFile,
  FileArtifact,
} from "@/hooks/useFileArtifacts";
import { FileUploader } from "./FileUploader";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Artifact } from "@/hooks/useArtifacts";

interface FilesSectionProps {
  projectId: string;
  workspaceId: string;
}

function FileAssociations({ fileArtifactId }: { fileArtifactId: string }) {
  const { data: artifacts, isLoading } = useArtifactsForFile(fileArtifactId);
  const navigate = useNavigate();

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  if (!artifacts || artifacts.length === 0) {
    return <span className="text-muted-foreground text-sm">No associations</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {artifacts.slice(0, 3).map((artifact) => (
        <Badge
          key={artifact.id}
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80"
          onClick={() => navigate(`/artifacts/${artifact.id}`)}
        >
          {artifact.short_id}
        </Badge>
      ))}
      {artifacts.length > 3 && (
        <Badge variant="outline">+{artifacts.length - 3}</Badge>
      )}
    </div>
  );
}

function FileAssociationsDialog({ file, artifacts }: { file: FileArtifact; artifacts: Artifact[] }) {
  const navigate = useNavigate();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Link2 className="w-4 h-4 mr-2" />
          View Associations ({artifacts.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Associated Artifacts</DialogTitle>
          <DialogDescription>
            "{file.content_json.file_name}" is attached to these artifacts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
              onClick={() => navigate(`/artifacts/${artifact.id}`)}
            >
              <div>
                <p className="font-medium">{artifact.title}</p>
                <p className="text-sm text-muted-foreground">
                  {artifact.short_id} • {artifact.type}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FilesSection({ projectId, workspaceId }: FilesSectionProps) {
  const [search, setSearch] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  const { data: files, isLoading } = useFileArtifacts(projectId);
  const deleteFileArtifact = useDeleteFileArtifact();

  const filteredFiles = files?.filter((file) =>
    file.content_json.file_name.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleDelete = async (file: FileArtifact) => {
    try {
      await deleteFileArtifact.mutateAsync({ fileArtifact: file });
      toast.success("File deleted");
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Files</h2>
          <p className="text-muted-foreground">
            {filteredFiles?.length || 0} files in this project
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Upload supporting documents to your project
              </DialogDescription>
            </DialogHeader>
            <FileUploader
              workspaceId={workspaceId}
              projectId={projectId}
              onUploadComplete={() => setIsUploadDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Files Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredFiles && filteredFiles.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Associations</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{file.content_json.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {file.content_json.file_type.split("/")[1]?.toUpperCase() || "FILE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(file.content_json.file_size)}
                  </TableCell>
                  <TableCell>
                    <FileAssociations fileArtifactId={file.id} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(file.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete file?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the file and remove all associations.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(file)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <File className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No files yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Upload supporting documents to attach to your artifacts
          </p>
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            className="bg-accent hover:bg-accent/90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      )}
    </div>
  );
}
