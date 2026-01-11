import { useState } from "react";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  ChevronDown,
  ChevronRight,
  Copy,
  Calendar,
  Zap,
  Bot,
  ArrowRight,
  Search,
  Filter,
  Save,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { usePipelineRuns, type PipelineRun, type PipelineStepResult } from "@/hooks/useAgentPipelines";
import { SaveAsArtifactDialog } from "./SaveAsArtifactDialog";

interface PipelineRunHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId?: string;
  pipelineId?: string;
  pipelineName?: string;
}

export function PipelineRunHistory({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  pipelineId,
  pipelineName,
}: PipelineRunHistoryProps) {
  const { data: runs, isLoading } = usePipelineRuns(workspaceId, pipelineId);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedRunForSave, setSelectedRunForSave] = useState<PipelineRun | null>(null);

  const toggleRun = (runId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const copyContent = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${label} copied to clipboard`);
  };

  const openSaveDialog = (run: PipelineRun) => {
    setSelectedRunForSave(run);
    setSaveDialogOpen(true);
  };

  const filteredRuns = runs?.filter(run => {
    if (statusFilter !== "all" && run.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesPipeline = run.pipeline?.name?.toLowerCase().includes(query);
      const matchesInput = run.input_content?.toLowerCase().includes(query);
      const matchesOutput = run.final_output?.toLowerCase().includes(query);
      return matchesPipeline || matchesInput || matchesOutput;
    }
    return true;
  }) || [];

  const getStatusIcon = (status: PipelineRun["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PipelineRun["status"]) => {
    const variants: Record<string, string> = {
      completed: "bg-green-500/10 text-green-500 border-green-500/30",
      running: "bg-accent/10 text-accent border-accent/30",
      failed: "bg-destructive/10 text-destructive border-destructive/30",
      cancelled: "bg-muted text-muted-foreground border-muted",
      pending: "bg-muted text-muted-foreground border-muted",
    };
    return variants[status] || variants.pending;
  };

  const getStepStatusIcon = (status: PipelineStepResult["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case "running":
        return <Loader2 className="w-3 h-3 text-accent animate-spin" />;
      case "failed":
        return <XCircle className="w-3 h-3 text-destructive" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getAgentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PRODUCT_AGENT: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      STORY_AGENT: "bg-green-500/10 text-green-500 border-green-500/30",
      QA_AGENT: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      ARCHITECTURE_AGENT: "bg-orange-500/10 text-orange-500 border-orange-500/30",
      UX_AGENT: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      SECURITY_AGENT: "bg-red-500/10 text-red-500 border-red-500/30",
      DOCS_AGENT: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const calculateDuration = (run: PipelineRun) => {
    if (!run.started_at) return null;
    const end = run.completed_at ? new Date(run.completed_at) : new Date();
    const start = new Date(run.started_at);
    const durationMs = end.getTime() - start.getTime();
    return (durationMs / 1000).toFixed(1);
  };

  const calculateTotalTokens = (stepResults: PipelineStepResult[]) => {
    return stepResults.reduce(
      (acc, r) => ({
        input: acc.input + (r.tokens?.input || 0),
        output: acc.output + (r.tokens?.output || 0),
      }),
      { input: 0, output: 0 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            Pipeline Run History
            {pipelineName && (
              <Badge variant="outline" className="ml-2">{pipelineName}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View past pipeline executions with step-by-step results and outputs
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-4 pb-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by pipeline name, input, or output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Runs list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No runs found</h3>
                <p className="text-muted-foreground text-sm">
                  {runs?.length === 0 
                    ? "Run a pipeline to see execution history here"
                    : "No runs match your search criteria"}
                </p>
              </div>
            ) : (
              filteredRuns.map((run) => {
                const isExpanded = expandedRuns.has(run.id);
                const duration = calculateDuration(run);
                const totalTokens = calculateTotalTokens(run.step_results);
                const completedSteps = run.step_results.filter(s => s.status === "completed").length;

                return (
                  <Collapsible key={run.id} open={isExpanded} onOpenChange={() => toggleRun(run.id)}>
                    <div className="border rounded-lg overflow-hidden">
                      {/* Run header */}
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-accent" />
                              <span className="font-medium truncate">
                                {run.pipeline?.name || "Unknown Pipeline"}
                              </span>
                              <Badge variant="outline" className={getStatusBadge(run.status)}>
                                {run.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(run.created_at), "MMM d, yyyy HH:mm")}
                              </span>
                              {duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {duration}s
                                </span>
                              )}
                              <span>
                                {completedSteps}/{run.step_results.length} steps
                              </span>
                              {totalTokens.output > 0 && (
                                <span>{totalTokens.input + totalTokens.output} tokens</span>
                              )}
                            </div>
                          </div>

                          {/* Mini step indicators */}
                          <div className="flex items-center gap-1">
                            {run.step_results.map((step, index) => (
                              <div 
                                key={step.stepId} 
                                className="flex items-center"
                                title={step.agentName}
                              >
                                {getStepStatusIcon(step.status)}
                                {index < run.step_results.length - 1 && (
                                  <ArrowRight className="w-2 h-2 text-muted-foreground mx-0.5" />
                                )}
                              </div>
                            ))}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="border-t bg-muted/20">
                          {/* Input */}
                          <div className="p-4 border-b">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Input
                              </span>
                              {run.input_content && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => copyContent(run.input_content!, "Input")}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <div className="bg-background rounded border p-3 text-sm font-mono max-h-32 overflow-auto">
                              {run.input_content || <span className="text-muted-foreground">No input content</span>}
                            </div>
                          </div>

                          {/* Steps */}
                          <div className="p-4 border-b">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
                              Step Results
                            </span>
                            <div className="space-y-3">
                              {run.step_results.map((step, index) => (
                                <div key={step.stepId} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                      step.status === "completed" 
                                        ? "bg-green-500/10 border-green-500/30" 
                                        : step.status === "failed"
                                        ? "bg-destructive/10 border-destructive/30"
                                        : "bg-muted border-muted"
                                    }`}>
                                      {getStepStatusIcon(step.status)}
                                    </div>
                                    {index < run.step_results.length - 1 && (
                                      <div className="w-0.5 flex-1 bg-muted my-1" />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Bot className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{step.agentName}</span>
                                      {step.durationMs && (
                                        <span className="text-xs text-muted-foreground">
                                          {(step.durationMs / 1000).toFixed(1)}s
                                        </span>
                                      )}
                                      {step.tokens && (
                                        <span className="text-xs text-muted-foreground">
                                          • {step.tokens.input + step.tokens.output} tokens
                                        </span>
                                      )}
                                    </div>
                                    {step.error && (
                                      <div className="text-sm text-destructive mb-2">
                                        Error: {step.error}
                                      </div>
                                    )}
                                    {step.output && (
                                      <div className="bg-background rounded border p-3 text-sm font-mono max-h-48 overflow-auto relative group">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="absolute top-1 right-1 h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => copyContent(step.output!, `Step ${index + 1} output`)}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                        {step.output.slice(0, 500)}
                                        {step.output.length > 500 && (
                                          <span className="text-muted-foreground">... ({step.output.length} chars)</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Final Output */}
                          {run.final_output && (
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  Final Output
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => openSaveDialog(run)}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => copyContent(run.final_output!, "Final output")}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="bg-background rounded border p-3 text-sm font-mono max-h-64 overflow-auto">
                                {run.final_output}
                              </div>
                            </div>
                          )}

                          {/* Error message */}
                          {run.error_message && (
                            <div className="p-4 bg-destructive/5 border-t border-destructive/20">
                              <span className="text-xs font-medium text-destructive uppercase tracking-wider block mb-2">
                                Error
                              </span>
                              <div className="text-sm text-destructive">
                                {run.error_message}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Save as Artifact Dialog */}
        {selectedRunForSave && (
          <SaveAsArtifactDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            content={selectedRunForSave.final_output || ""}
            workspaceId={workspaceId}
            projectId={projectId}
            pipelineRunId={selectedRunForSave.id}
            pipelineName={selectedRunForSave.pipeline?.name}
            suggestedTitle={`${selectedRunForSave.pipeline?.name || "Pipeline"} Output - ${format(new Date(selectedRunForSave.created_at), "MMM d, yyyy")}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}