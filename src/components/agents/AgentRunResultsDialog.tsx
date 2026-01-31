import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Bot,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  FileText,
  Coins,
  Code,
  FileJson,
  Save,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AIRun, AIRunStatus } from "@/hooks/useAIRuns";
import type { Json } from "@/integrations/supabase/types";
import { SaveAsArtifactDialog } from "./SaveAsArtifactDialog";

interface AgentRunResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: (AIRun & {
    agent_config: { id: string; name: string; agent_type: string; persona?: string | null; system_prompt?: string | null } | null;
    model: { id: string; model_name: string; display_name: string } | null;
  }) | null;
  workspaceId: string;
  projectId?: string;
}

const statusConfig: Record<AIRunStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-slate-600", bgColor: "bg-slate-100", label: "Pending" },
  RUNNING: { icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100", label: "Running" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100", label: "Completed" },
  FAILED: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100", label: "Failed" },
  CANCELLED: { icon: XCircle, color: "text-amber-600", bgColor: "bg-amber-100", label: "Cancelled" },
};

function JsonViewer({ data, label }: { data: Json; label: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <FileJson className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-64">
            <pre className="p-4 text-xs font-mono bg-background whitespace-pre-wrap break-words">
              {jsonString}
            </pre>
          </ScrollArea>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function OutputItem({ output, index, onSave }: { output: Json; index: number; onSave: (content: string) => void }) {
  const [copied, setCopied] = useState(false);

  const getContent = (): string => {
    if (typeof output === "string") return output;
    if (output && typeof output === "object") {
      if ("content" in output && typeof output.content === "string") return output.content;
      if ("text" in output && typeof output.text === "string") return output.text;
      if ("markdown" in output && typeof output.markdown === "string") return output.markdown;
      return JSON.stringify(output, null, 2);
    }
    return String(output);
  };

  const content = getContent();
  const isJson = typeof output === "object" && output !== null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <span className="font-medium text-sm">Output {index + 1}</span>
          {isJson && (
            <Badge variant="secondary" className="text-xs">JSON</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSave(content)}>
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="max-h-64">
        <pre className="p-4 text-sm font-mono bg-background whitespace-pre-wrap break-words">
          {content}
        </pre>
      </ScrollArea>
    </div>
  );
}

export function AgentRunResultsDialog({
  open,
  onOpenChange,
  run,
  workspaceId,
  projectId,
}: AgentRunResultsDialogProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [contentToSave, setContentToSave] = useState("");

  if (!run) return null;

  const status = statusConfig[run.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  const outputs = Array.isArray(run.output_artifacts) ? run.output_artifacts : [];
  const hasInputContext = run.input_context && Object.keys(run.input_context as object).length > 0;
  const hasMetadata = run.metadata && Object.keys(run.metadata as object).length > 0;

  const handleSaveOutput = (content: string) => {
    setContentToSave(content);
    setSaveDialogOpen(true);
  };

  const totalTokens = (run.input_tokens || 0) + (run.output_tokens || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              Agent Run Results
            </DialogTitle>
            <DialogDescription>
              View the complete results and data from this agent run
            </DialogDescription>
          </DialogHeader>

          {/* Run Summary */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className={cn("p-2 rounded-lg", status.bgColor)}>
              <StatusIcon className={cn(
                "w-4 h-4",
                status.color,
                run.status === "RUNNING" && "animate-spin"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {run.agent_config?.name || "Unknown Agent"}
                </span>
                <Badge variant="outline" className={cn("capitalize", status.color)}>
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {run.model && (
                  <span className="flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    {run.model.display_name}
                  </span>
                )}
                {run.started_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(run.started_at), "MMM d, yyyy h:mm a")}
                  </span>
                )}
              </div>
            </div>

            {run.status === "COMPLETED" && (
              <div className="flex items-center gap-4 text-sm">
                {totalTokens > 0 && (
                  <div className="text-center">
                    <div className="font-medium">{totalTokens.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                  </div>
                )}
                {run.duration_ms && (
                  <div className="text-center">
                    <div className="font-medium">{(run.duration_ms / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-muted-foreground">duration</div>
                  </div>
                )}
                {run.total_cost !== null && run.total_cost > 0 && (
                  <div className="text-center">
                    <div className="font-medium flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      ${run.total_cost.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">cost</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {run.status === "FAILED" && run.error_message && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                <XCircle className="w-4 h-4" />
                Error
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{run.error_message}</p>
            </div>
          )}

          {/* Content Tabs */}
          <Tabs defaultValue="outputs" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="outputs" className="gap-2">
                <FileText className="w-4 h-4" />
                Outputs ({outputs.length})
              </TabsTrigger>
              <TabsTrigger value="input" className="gap-2" disabled={!hasInputContext}>
                <Code className="w-4 h-4" />
                Input
              </TabsTrigger>
              <TabsTrigger value="metadata" className="gap-2" disabled={!hasMetadata}>
                <FileJson className="w-4 h-4" />
                Metadata
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 min-h-0">
              <TabsContent value="outputs" className="m-0 space-y-3">
                {outputs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No outputs available</p>
                  </div>
                ) : (
                  outputs.map((output, index) => (
                    <OutputItem 
                      key={index} 
                      output={output} 
                      index={index}
                      onSave={handleSaveOutput}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="input" className="m-0 space-y-3">
                {hasInputContext && (
                  <JsonViewer data={run.input_context as Json} label="Input Context" />
                )}
              </TabsContent>

              <TabsContent value="metadata" className="m-0 space-y-3">
                {hasMetadata && (
                  <JsonViewer data={run.metadata as Json} label="Run Metadata" />
                )}
                
                {/* Token breakdown */}
                {(run.input_tokens || run.output_tokens) && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-accent" />
                      Token Usage
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Input Tokens:</span>
                        <span className="ml-2 font-medium">{(run.input_tokens || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output Tokens:</span>
                        <span className="ml-2 font-medium">{(run.output_tokens || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <SaveAsArtifactDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        content={contentToSave}
        workspaceId={workspaceId}
        projectId={projectId}
        suggestedTitle={`Output from ${run.agent_config?.name || "Agent"}`}
        suggestedType="IDEA"
      />
    </>
  );
}
