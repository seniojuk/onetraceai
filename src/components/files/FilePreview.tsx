import { useState, useEffect } from "react";
import { Eye, Download, Maximize2, Loader2, FileText, Image as ImageIcon, FileCode, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileArtifact, getFileDownloadUrl, downloadFile } from "@/hooks/useFileArtifacts";
import { supabase } from "@/integrations/supabase/client";
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

const PREVIEWABLE_TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "text/json",
  "text/css",
  "text/html",
  "text/xml",
  "application/xml",
];

// File extensions that indicate text files (for cases where MIME type isn't accurate)
const TEXT_FILE_EXTENSIONS = [".md", ".markdown", ".txt", ".json", ".css", ".html", ".xml", ".yaml", ".yml", ".log"];

function isTextFile(fileType: string, fileName: string): boolean {
  if (PREVIEWABLE_TEXT_TYPES.includes(fileType)) return true;
  const lowerName = fileName.toLowerCase();
  return TEXT_FILE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

function isPreviewable(fileType: string, fileName?: string): boolean {
  return (
    PREVIEWABLE_IMAGE_TYPES.includes(fileType) ||
    PREVIEWABLE_PDF_TYPES.includes(fileType) ||
    isTextFile(fileType, fileName || "")
  );
}

function getPreviewType(fileType: string, fileName?: string): "image" | "pdf" | "text" | "none" {
  if (PREVIEWABLE_IMAGE_TYPES.includes(fileType)) return "image";
  if (PREVIEWABLE_PDF_TYPES.includes(fileType)) return "pdf";
  if (isTextFile(fileType, fileName || "")) return "text";
  return "none";
}

function getTextLanguage(fileType: string, fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json") || fileType.includes("json")) return "json";
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || fileType.includes("markdown")) return "markdown";
  if (lowerName.endsWith(".css")) return "css";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";
  if (lowerName.endsWith(".xml") || fileType.includes("xml")) return "xml";
  if (lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) return "yaml";
  return "plaintext";
}

export function FilePreview({ file, trigger }: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const fileType = file.content_json.file_type;
  const fileName = file.content_json.file_name;
  const previewType = getPreviewType(fileType, fileName);
  const canPreview = previewType !== "none";
  const fileUrl = getFileDownloadUrl(file.content_json.storage_path);
  const textLanguage = previewType === "text" ? getTextLanguage(fileType, fileName) : null;

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

  const loadTextContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: downloadError } = await supabase.storage
        .from("artifact-files")
        .download(file.content_json.storage_path);
      
      if (downloadError) throw downloadError;
      
      const text = await data.text();
      setTextContent(text);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load file content");
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      setError(null);
      setTextContent(null);
      
      if (previewType === "text") {
        loadTextContent();
      }
    }
  };

  if (!canPreview) {
    return null;
  }

  const getFileIcon = () => {
    if (textLanguage === "json") return <FileJson className="w-4 h-4 text-muted-foreground" />;
    if (textLanguage === "markdown") return <FileText className="w-4 h-4 text-muted-foreground" />;
    if (previewType === "text") return <FileCode className="w-4 h-4 text-muted-foreground" />;
    if (previewType === "image") return <ImageIcon className="w-4 h-4 text-muted-foreground" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const renderTextContent = () => {
    if (!textContent) return null;

    if (textLanguage === "json") {
      try {
        const parsed = JSON.parse(textContent);
        const formatted = JSON.stringify(parsed, null, 2);
        return (
          <pre className="text-sm font-mono p-4 whitespace-pre-wrap break-words text-foreground">
            {formatted}
          </pre>
        );
      } catch {
        // If JSON parsing fails, render as plain text
      }
    }

    if (textLanguage === "markdown") {
      return (
        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-transparent p-0 text-foreground">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <pre className="text-sm font-mono p-4 whitespace-pre-wrap break-words text-foreground">
        {textContent}
      </pre>
    );
  };

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
              {getFileIcon()}
              {file.content_json.file_name}
              {textLanguage && (
                <span className="text-xs text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                  {textLanguage}
                </span>
              )}
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
              {previewType !== "text" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(fileUrl, "_blank")}
                  title="Open in new tab"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}
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
          {previewType === "text" && !isLoading && !error && (
            <ScrollArea className="h-[calc(90vh-80px)]">
              {renderTextContent()}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export utility to check if file is previewable
export { isPreviewable, getPreviewType };
