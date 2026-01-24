import { useState, useRef } from "react";
import { Upload, File, X, Loader2, AlertTriangle, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUploadFile, FileArtifact } from "@/hooks/useFileArtifacts";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { toast } from "sonner";

interface FileUploaderProps {
  workspaceId: string;
  projectId: string;
  associatedArtifactId?: string;
  onUploadComplete?: (uploadedFiles: FileArtifact[]) => void;
  className?: string;
}

export function FileUploader({
  workspaceId,
  projectId,
  associatedArtifactId,
  onUploadComplete,
  className,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const { canUploadFile, storageWarning, storageAtLimit, usage } = useUsageLimits();

  const formatStorageSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getRemainingStorage = (): number => {
    if (!usage?.storage || usage.storage.limit === null) return Infinity;
    const limitBytes = usage.storage.limit * 1024 * 1024; // Convert MB to bytes
    const usedBytes = usage.storage.used * 1024 * 1024;
    return Math.max(0, limitBytes - usedBytes);
  };

  const getStoragePercentage = (): number => {
    if (!usage?.storage || usage.storage.limit === null) return 0;
    return Math.min(100, (usage.storage.used / usage.storage.limit) * 100);
  };

  const getTotalSelectedSize = (): number => {
    return selectedFiles.reduce((acc, file) => acc + file.size, 0);
  };

  const wouldExceedLimit = (): boolean => {
    if (!usage?.storage || usage.storage.limit === null) return false;
    const totalSelectedBytes = getTotalSelectedSize();
    const remainingBytes = getRemainingStorage();
    return totalSelectedBytes > remainingBytes;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (storageAtLimit) {
      toast.error("Storage limit reached. Please upgrade your plan to upload files.");
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (storageAtLimit) {
      toast.error("Storage limit reached. Please upgrade your plan to upload files.");
      return;
    }
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    if (storageAtLimit) {
      toast.error("Storage limit reached. Please upgrade your plan to upload files.");
      return;
    }

    if (wouldExceedLimit()) {
      toast.error(`These files would exceed your storage limit. You have ${formatStorageSize(getRemainingStorage())} remaining.`);
      return;
    }

    try {
      const uploadedArtifacts: FileArtifact[] = [];
      
      for (const file of selectedFiles) {
        const result = await uploadFile.mutateAsync({
          file,
          workspaceId,
          projectId,
          associatedArtifactId,
        });
        uploadedArtifacts.push(result);
      }
      
      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      setSelectedFiles([]);
      onUploadComplete?.(uploadedArtifacts);
    } catch (error) {
      toast.error("Failed to upload files");
      console.error("Upload error:", error);
    }
  };

  const storagePercentage = getStoragePercentage();
  const remainingStorage = getRemainingStorage();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Storage Usage Indicator */}
      {usage?.storage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Storage</span>
            </div>
            <span className={cn(
              "font-medium",
              storageAtLimit && "text-destructive",
              storageWarning && !storageAtLimit && "text-amber-600"
            )}>
              {usage.storage.limit !== null 
                ? `${formatStorageSize(usage.storage.used * 1024 * 1024)} / ${formatStorageSize(usage.storage.limit * 1024 * 1024)}`
                : `${formatStorageSize(usage.storage.used * 1024 * 1024)} used`
              }
            </span>
          </div>
          {usage.storage.limit !== null && (
            <Progress 
              value={storagePercentage} 
              className={cn(
                "h-2",
                storageAtLimit && "[&>div]:bg-destructive",
                storageWarning && !storageAtLimit && "[&>div]:bg-amber-500"
              )}
            />
          )}
          {remainingStorage !== Infinity && (
            <p className={cn(
              "text-xs",
              storageAtLimit ? "text-destructive" : "text-muted-foreground"
            )}>
              {storageAtLimit 
                ? "No storage space remaining" 
                : `${formatStorageSize(remainingStorage)} remaining`
              }
            </p>
          )}
        </div>
      )}

      {/* Storage Limit Warning */}
      {storageAtLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You've reached your storage limit. Upgrade your plan to upload more files.
          </AlertDescription>
        </Alert>
      )}

      {storageWarning && !storageAtLimit && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            You're approaching your storage limit. Consider upgrading your plan.
          </AlertDescription>
        </Alert>
      )}

      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          storageAtLimit && "opacity-50 cursor-not-allowed",
          !storageAtLimit && "cursor-pointer",
          isDragging && !storageAtLimit && "border-accent bg-accent/5",
          !isDragging && !storageAtLimit && "border-border hover:border-accent/50"
        )}
        onDragOver={!storageAtLimit ? handleDragOver : undefined}
        onDragLeave={!storageAtLimit ? handleDragLeave : undefined}
        onDrop={!storageAtLimit ? handleDrop : undefined}
        onClick={() => !storageAtLimit && fileInputRef.current?.click()}
      >
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            storageAtLimit ? "bg-destructive/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "w-6 h-6",
              storageAtLimit ? "text-destructive" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              "font-medium",
              storageAtLimit ? "text-destructive" : "text-foreground"
            )}>
              {storageAtLimit ? "Storage limit reached" : "Drop files here or click to upload"}
            </p>
            <p className="text-sm text-muted-foreground">
              {storageAtLimit 
                ? "Upgrade your plan to upload more files" 
                : "PDF, DOCX, images, and other documents"
              }
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={storageAtLimit}
          />
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected files ({selectedFiles.length})
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Show warning if selected files would exceed limit */}
          {wouldExceedLimit() && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Selected files ({formatFileSize(getTotalSelectedSize())}) exceed remaining storage ({formatStorageSize(remainingStorage)}).
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={handleUpload}
            disabled={uploadFile.isPending || storageAtLimit || wouldExceedLimit()}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {uploadFile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedFiles.length} file(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
