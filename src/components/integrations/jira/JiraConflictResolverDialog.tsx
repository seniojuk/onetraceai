import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useResolveConflict } from "@/hooks/useJiraConflicts";
import { ArrowLeft, ArrowRight, GitMerge, Loader2, ExternalLink } from "lucide-react";

interface ConflictData {
  mappingId: string;
  workspaceId: string;
  jiraIssueKey: string;
  jiraIssueUrl: string;
  artifact: {
    id: string;
    title: string;
    type: string;
    content_markdown: string | null;
    short_id: string;
  };
  jira: {
    summary: string;
    description: string;
  };
}

interface JiraConflictResolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictData | null;
}

// Simple ADF to text converter
function adfToText(adf: unknown): string {
  if (!adf) return "";
  
  const extractText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    
    const n = node as { type?: string; text?: string; content?: unknown[] };
    
    if (n.type === "text" && n.text) {
      return n.text;
    }
    
    if (Array.isArray(n.content)) {
      return n.content.map(extractText).join("\n");
    }
    
    return "";
  };
  
  return extractText(adf);
}

export function JiraConflictResolverDialog({
  open,
  onOpenChange,
  conflict,
}: JiraConflictResolverDialogProps) {
  const resolveConflict = useResolveConflict();
  const [activeTab, setActiveTab] = useState<"compare" | "merge">("compare");
  const [mergedTitle, setMergedTitle] = useState("");
  const [mergedContent, setMergedContent] = useState("");

  if (!conflict) return null;

  const handleResolve = async (resolution: "accept_jira" | "accept_onetrace" | "merge") => {
    const params: Parameters<typeof resolveConflict.mutate>[0] = {
      mappingId: conflict.mappingId,
      workspaceId: conflict.workspaceId,
      resolution,
    };

    if (resolution === "merge") {
      params.mergedContent = {
        title: mergedTitle || conflict.artifact.title,
        content: mergedContent || conflict.artifact.content_markdown || "",
      };
    }

    resolveConflict.mutate(params, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleStartMerge = () => {
    setMergedTitle(conflict.artifact.title);
    setMergedContent(conflict.artifact.content_markdown || "");
    setActiveTab("merge");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-amber-500" />
            Resolve Conflict
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">{conflict.artifact.short_id}</Badge>
            <span>conflicts with</span>
            <a
              href={conflict.jiraIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {conflict.jiraIssueKey}
              <ExternalLink className="h-3 w-3" />
            </a>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compare" | "merge")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="merge">Manual Merge</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="flex-1 min-h-0 mt-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* OneTrace Side */}
              <div className="border rounded-lg p-4 flex flex-col bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">OneTrace</h4>
                  <Badge variant="secondary">{conflict.artifact.type}</Badge>
                </div>
                <div className="mb-2">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="font-medium">{conflict.artifact.title}</p>
                </div>
                <div className="flex-1 min-h-0">
                  <Label className="text-xs text-muted-foreground">Content</Label>
                  <ScrollArea className="h-[200px] mt-1 rounded border bg-muted/30 p-2">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {conflict.artifact.content_markdown || "(No content)"}
                    </pre>
                  </ScrollArea>
                </div>
              </div>

              {/* Jira Side */}
              <div className="border rounded-lg p-4 flex flex-col bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Jira</h4>
                  <Badge variant="outline">{conflict.jiraIssueKey}</Badge>
                </div>
                <div className="mb-2">
                  <Label className="text-xs text-muted-foreground">Summary</Label>
                  <p className="font-medium">{conflict.jira.summary}</p>
                </div>
                <div className="flex-1 min-h-0">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <ScrollArea className="h-[200px] mt-1 rounded border bg-muted/30 p-2">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {conflict.jira.description || "(No description)"}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => handleResolve("accept_jira")}
                disabled={resolveConflict.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Accept Jira
              </Button>
              <Button
                variant="secondary"
                onClick={handleStartMerge}
                disabled={resolveConflict.isPending}
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Manual Merge
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve("accept_onetrace")}
                disabled={resolveConflict.isPending}
              >
                Accept OneTrace
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="merge" className="flex-1 min-h-0 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="merged-title">Merged Title</Label>
                <Input
                  id="merged-title"
                  value={mergedTitle}
                  onChange={(e) => setMergedTitle(e.target.value)}
                  placeholder="Enter the merged title"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="merged-content">Merged Content</Label>
                <Textarea
                  id="merged-content"
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  placeholder="Enter the merged content"
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Edit the content above to create a merged version. This will update both OneTrace and Jira.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {activeTab === "merge" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("compare")}
                disabled={resolveConflict.isPending}
              >
                Back to Compare
              </Button>
              <Button
                onClick={() => handleResolve("merge")}
                disabled={resolveConflict.isPending || !mergedTitle.trim()}
              >
                {resolveConflict.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GitMerge className="h-4 w-4 mr-2" />
                )}
                Save Merged Version
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { adfToText };
