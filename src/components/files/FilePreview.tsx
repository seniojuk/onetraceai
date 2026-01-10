import { useState } from "react";
import { Eye, X, Download, Maximize2, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileArtifact, getFileDownloadUrl, downloadFile } from "@/hooks/useFileArtifacts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  file: FileArtifact;
  trigger?: React.ReactNode;
}

const PREVIEWABLE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const PREVIEWABLE_PDF_TYPES = ["application/pdf"];

function isPreviewable(fileType: string): boolean {
  return (
    PREVIEWABLE_IMAGE_TYPES.includes(fileType) ||
    PREVIEWABLE_PDF_TYPES.includes(fileType)
  );
}

function getPreviewType(fileType: string): "image" | "pdf" | "none" {
  if (PREVIEWABLE_IMAGE_TYPES.includes(fileType)) return "image";
  if (PREVIEWABLE_PDF_TYPES.includes(fileType)) return "pdf";
  return "none";
}

export function FilePreview({ file, trigger }: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileType = file.content_json.file_type;
  const previewType = getPreviewType(fileType);
  const canPreview = previewType !== "none";
  const fileUrl = getFileDownloadUrl(file.content_json.storage_path);

  const handleDownload = async () => {
    try {
      await downloadFile(file.content_json.storage_path, file.content_json.file_name);
      toast.success("File downloaded");
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load preview");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      setError(null);
    }
  };

  if (!canPreview) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(true)}
          title="Preview file"
        >
          <Eye className="w-4 h-4" />
        </Button>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              {previewType === "image" ? (
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
              {file.content_json.file_name}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(fileUrl, "_blank")}
                title="Open in new tab"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="relative flex-1 min-h-[400px] max-h-[calc(90vh-80px)] overflow-auto bg-muted/30">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <p>{error}</p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download instead
              </Button>
            </div>
          )}
          {previewType === "image" && (
            <div className="flex items-center justify-center p-4 min-h-[400px]">
              <img
                src={fileUrl}
                alt={file.content_json.file_name}
                className={cn(
                  "max-w-full max-h-[calc(90vh-120px)] object-contain rounded-md",
                  isLoading && "opacity-0",
                  !isLoading && "opacity-100 transition-opacity"
                )}
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>
          )}
          {previewType === "pdf" && (
            <iframe
              src={`${fileUrl}#view=FitH`}
              className={cn(
                "w-full h-[calc(90vh-80px)] border-0",
                isLoading && "opacity-0"
              )}
              title={file.content_json.file_name}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export utility to check if file is previewable
export { isPreviewable, getPreviewType };
