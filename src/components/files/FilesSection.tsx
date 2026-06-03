import { useState, useMemo } from "react";
import {
  File as FileIcon,
  Download,
  Trash2,
  Link2,
  Search,
  Upload,
  Loader2,
  MoreVertical,
  Eye,
  FileImage,
  FileText as FileTextIcon,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

/* Map mime to icon */
function fileIconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.includes("zip") || mime.includes("compressed")) return FileArchive;
  if (mime.includes("sheet") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.startsWith("text/") || mime.includes("pdf") || mime.includes("doc"))
    return FileTextIcon;
  return FileIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function FileAssociationsInline({ fileArtifactId }: { fileArtifactId: string }) {
  const { data: artifacts, isLoading } = useArtifactsForFile(fileArtifactId);
  const navigate = useNavigate();

  if (isLoading)
    return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
  if (!artifacts || artifacts.length === 0)
    return (
      <span className="text-[11px] text-muted-foreground/60">Unattached</span>
    );

  return (
    <div className="flex items-center gap-1">
      {artifacts.slice(0, 2).map((artifact) => (
        <button
          key={artifact.id}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/artifacts/${artifact.id}`);
          }}
          className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          {artifact.short_id}
        </button>
      ))}
      {artifacts.length > 2 && (
        <span className="text-[10px] text-muted-foreground">
          +{artifacts.length - 2}
        </span>
      )}
    </div>
  );
}

export function FilesSection() {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const projectId = currentProjectId || "";
  const workspaceId = currentWorkspaceId || "";
  const [search, setSearch] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const { data: files, isLoading } = useFileArtifacts(projectId);
  const deleteFileArtifact = useDeleteFileArtifact();

  const filteredFiles = useMemo(
    () =>
      files?.filter((f) =>
        f.content_json.file_name.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [files, search],
  );

  const totals = useMemo(() => {
    const total = files?.length ?? 0;
    const size =
      files?.reduce((acc, f) => acc + (f.content_json.file_size || 0), 0) ?? 0;
    const images =
      files?.filter((f) => f.content_json.file_type?.startsWith("image/"))
        .length ?? 0;
    return { total, size, images };
  }, [files]);

  const handleDownload = async (file: FileArtifact) => {
    try {
      await downloadFile(
        file.content_json.storage_path,
        file.content_json.file_name,
      );
      toast.success("File downloaded");
    } catch {
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (file: FileArtifact) => {
    try {
      await deleteFileArtifact.mutateAsync({ fileArtifact: file });
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  };

  return (
    <div className="space-y-4">
      {/* Pulse strip */}
      <section className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatTile label="Files" value={totals.total.toString()} />
          <StatTile label="Total size" value={formatFileSize(totals.size)} />
          <StatTile label="Images" value={totals.images.toString()} muted />
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 text-[12px]">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload files
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">Upload files</DialogTitle>
              <DialogDescription className="text-[12px]">
                Attach supporting documents to this project. Link them to
                artifacts after upload.
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 w-full rounded-lg border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_80px_100px_140px_120px_40px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
            <div>Name</div>
            <div>Type</div>
            <div className="text-right">Size</div>
            <div>Linked to</div>
            <div>Uploaded</div>
            <div />
          </div>

          <ul className="divide-y divide-border">
            {filteredFiles.map((file) => {
              const Icon = fileIconFor(file.content_json.file_type || "");
              const ext =
                file.content_json.file_type?.split("/")[1]?.toUpperCase() ||
                "FILE";

              return (
                <li
                  key={file.id}
                  className="group grid grid-cols-[1fr_80px_100px_140px_120px_40px] gap-3 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md border border-border bg-muted/40 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[13px] text-foreground truncate font-medium">
                      {file.content_json.file_name}
                    </span>
                  </div>

                  <div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-normal h-5 px-1.5"
                    >
                      {ext}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground tabular-nums text-right">
                    {formatFileSize(file.content_json.file_size)}
                  </div>

                  <div className="min-w-0">
                    <FileAssociationsInline fileArtifactId={file.id} />
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    {relativeTime(file.created_at)}
                  </div>

                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-3.5 h-3.5 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete file?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes{" "}
                                <span className="font-medium text-foreground">
                                  {file.content_json.file_name}
                                </span>{" "}
                                and removes all artifact associations.
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-muted/40 border border-border flex items-center justify-center mx-auto mb-3">
            <FileIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-medium text-foreground">
            {search ? "No files match" : "No files yet"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? "Try a different search."
              : "Upload supporting docs to attach to artifacts."}
          </p>
          {!search && (
            <Button
              size="sm"
              className="h-8 text-[12px] mt-4"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload files
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-xl font-semibold tracking-tight mt-0.5 tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
