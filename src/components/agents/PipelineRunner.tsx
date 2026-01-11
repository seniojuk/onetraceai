import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  StopCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Clock,
  Bot,
  Zap,
  Copy,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { AgentPipeline, PipelineStep, PipelineStepResult } from "@/hooks/useAgentPipelines";
import { SaveAsArtifactDialog } from "./SaveAsArtifactDialog";

interface PipelineRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: AgentPipeline | null;
  workspaceId: string;
  projectId?: string;
}

interface RunState {
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  currentStep: number;
  stepResults: PipelineStepResult[];
  finalOutput: string;
  startTime?: number;
}

export function PipelineRunner({
  open,
  onOpenChange,
  pipeline,
  workspaceId,
  projectId,
}: PipelineRunnerProps) {
  const [inputContent, setInputContent] = useState("");
  const [runState, setRunState] = useState<RunState>({
    status: "idle",
    currentStep: 0,
    stepResults: [],
    finalOutput: "",
  });
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setRunState({
        status: "idle",
        currentStep: 0,
        stepResults: [],
        finalOutput: "",
      });
      setInputContent("");
      setPipelineRunId(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open]);

  useEffect(() => {
    // Auto-scroll to bottom when output updates
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [runState.stepResults, runState.finalOutput]);

  if (!pipeline) return null;

  const runPipeline = async () => {
    if (!inputContent.trim()) {
      toast.error("Please provide input content");
      return;
    }

    abortControllerRef.current = new AbortController();
    const startTime = Date.now();
    
    // Initialize step results
    const initialResults: PipelineStepResult[] = pipeline.steps.map(step => ({
      stepId: step.id,
      agentId: step.agentId,
      agentName: step.agentName,
      status: "pending",
    }));

    setRunState({
      status: "running",
      currentStep: 0,
      stepResults: initialResults,
      finalOutput: "",
      startTime,
    });

    let currentOutput = inputContent;

    try {
      for (let i = 0; i < pipeline.steps.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error("Pipeline cancelled");
        }

        const step = pipeline.steps[i];
        
        // Update current step to running
        setRunState(prev => ({
          ...prev,
          currentStep: i,
          stepResults: prev.stepResults.map((r, idx) => 
            idx === i ? { ...r, status: "running" } : r
          ),
        }));

        // Prepare input based on mapping
        let stepInput = currentOutput;
        if (step.inputMapping === "initial_input") {
          stepInput = inputContent;
        } else if (step.inputMapping === "custom" && step.customPrompt) {
          stepInput = step.customPrompt.replace("{{previous_output}}", currentOutput);
        }

        // Call agent
        const stepStart = Date.now();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-agent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              agentId: step.agentId,
              inputContent: stepInput,
              workspaceId,
              projectId,
              stream: false,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Step ${i + 1} failed`);
        }

        const result = await response.json();
        const stepDuration = Date.now() - stepStart;
        currentOutput = result.content || result.parsedOutput || "";

        // Update step result
        setRunState(prev => ({
          ...prev,
          stepResults: prev.stepResults.map((r, idx) => 
            idx === i ? {
              ...r,
              status: "completed",
              output: currentOutput,
              tokens: {
                input: result.usage?.inputTokens || 0,
                output: result.usage?.outputTokens || 0,
              },
              durationMs: stepDuration,
            } : r
          ),
        }));
      }

      // Pipeline completed successfully
      setRunState(prev => ({
        ...prev,
        status: "completed",
        finalOutput: currentOutput,
      }));

      toast.success("Pipeline completed successfully!");
    } catch (error) {
      const isCancelled = error instanceof Error && error.message === "Pipeline cancelled";
      
      setRunState(prev => ({
        ...prev,
        status: isCancelled ? "cancelled" : "failed",
        stepResults: prev.stepResults.map((r, idx) => 
          idx === prev.currentStep && r.status === "running" 
            ? { ...r, status: "failed", error: error instanceof Error ? error.message : "Unknown error" }
            : r
        ),
      }));

      if (!isCancelled) {
        toast.error(error instanceof Error ? error.message : "Pipeline failed");
      }
    }
  };

  const stopPipeline = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const resetPipeline = () => {
    setRunState({
      status: "idle",
      currentStep: 0,
      stepResults: [],
      finalOutput: "",
    });
    setPipelineRunId(null);
  };

  const openSaveDialog = () => {
    setIsSaveDialogOpen(true);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(runState.finalOutput);
    toast.success("Output copied to clipboard");
  };

  const progress = runState.status === "idle" 
    ? 0 
    : Math.round(((runState.currentStep + (runState.status === "completed" ? 1 : 0)) / pipeline.steps.length) * 100);

  const totalTokens = runState.stepResults.reduce(
    (acc, r) => ({
      input: acc.input + (r.tokens?.input || 0),
      output: acc.output + (r.tokens?.output || 0),
    }),
    { input: 0, output: 0 }
  );

  const totalDuration = runState.startTime 
    ? Math.round((Date.now() - runState.startTime) / 1000)
    : 0;

  const getStepStatusIcon = (status: PipelineStepResult["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Run Pipeline: {pipeline.name}
          </DialogTitle>
          <DialogDescription>
            {pipeline.description || `Execute ${pipeline.steps.length} agents in sequence`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Progress bar */}
          {runState.status !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Step {Math.min(runState.currentStep + 1, pipeline.steps.length)} of {pipeline.steps.length}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4">
            {/* Left: Input/Steps */}
            <div className="col-span-1 space-y-4 overflow-hidden flex flex-col">
              {runState.status === "idle" ? (
                <div className="space-y-2 flex-1">
                  <Label>Initial Input</Label>
                  <Textarea
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder="Enter the content to process through the pipeline..."
                    className="flex-1 min-h-[200px] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <Label className="mb-2 block">Pipeline Steps</Label>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {pipeline.steps.map((step, index) => {
                        const result = runState.stepResults[index];
                        return (
                          <div
                            key={step.id}
                            className={`p-3 rounded-lg border transition-all ${
                              result?.status === "running" 
                                ? "border-accent bg-accent/5" 
                                : result?.status === "completed"
                                ? "border-green-500/30 bg-green-500/5"
                                : result?.status === "failed"
                                ? "border-destructive/30 bg-destructive/5"
                                : "border-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {getStepStatusIcon(result?.status || "pending")}
                              <span className="font-medium text-sm">{step.agentName}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ml-auto ${getAgentTypeColor(step.agentType)}`}
                              >
                                {step.agentType.replace(/_/g, " ").replace(" AGENT", "")}
                              </Badge>
                            </div>
                            {result?.durationMs && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {(result.durationMs / 1000).toFixed(1)}s • {result.tokens?.output || 0} tokens
                              </div>
                            )}
                            {result?.error && (
                              <div className="text-xs text-destructive mt-1">
                                {result.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Right: Output */}
            <div className="col-span-2 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label>
                  {runState.status === "idle" 
                    ? "Pipeline Preview" 
                    : runState.status === "completed"
                    ? "Final Output"
                    : "Current Output"}
                </Label>
                {runState.finalOutput && (
                  <Button variant="ghost" size="sm" onClick={copyOutput}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
              
              <div 
                ref={outputRef}
                className="flex-1 rounded-lg border bg-muted/30 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap"
              >
                {runState.status === "idle" ? (
                  <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                    <Badge variant="secondary">Input</Badge>
                    {pipeline.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        <Badge className={getAgentTypeColor(step.agentType)}>
                          {step.agentName}
                        </Badge>
                      </div>
                    ))}
                    <ArrowRight className="w-4 h-4" />
                    <Badge variant="secondary">Output</Badge>
                  </div>
                ) : runState.finalOutput ? (
                  runState.finalOutput
                ) : runState.stepResults[runState.currentStep]?.output ? (
                  <div className="text-muted-foreground">
                    <span className="text-xs uppercase tracking-wider block mb-2">
                      Step {runState.currentStep + 1} Output:
                    </span>
                    {runState.stepResults[runState.currentStep].output}
                  </div>
                ) : runState.status === "running" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing {pipeline.steps[runState.currentStep]?.agentName}...
                  </div>
                ) : null}
              </div>

              {/* Stats */}
              {runState.status === "completed" && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Duration: {totalDuration}s</span>
                  <span>Input tokens: {totalTokens.input}</span>
                  <span>Output tokens: {totalTokens.output}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {runState.status === "completed" && (
            <div className="flex gap-2 mr-auto">
              <Button variant="outline" onClick={resetPipeline}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Run Again
              </Button>
              <Button variant="outline" onClick={openSaveDialog}>
                <Save className="w-4 h-4 mr-2" />
                Save as Artifact
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {runState.status === "completed" ? "Close" : "Cancel"}
          </Button>
          {runState.status === "running" ? (
            <Button variant="destructive" onClick={stopPipeline}>
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : runState.status === "idle" && (
            <Button 
              onClick={runPipeline}
              disabled={!inputContent.trim()}
              className="bg-accent hover:bg-accent/90"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Pipeline
            </Button>
          )}
        </DialogFooter>

        {/* Save as Artifact Dialog */}
        <SaveAsArtifactDialog
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          content={runState.finalOutput}
          workspaceId={workspaceId}
          projectId={projectId}
          pipelineRunId={pipelineRunId || undefined}
          pipelineName={pipeline.name}
          suggestedTitle={`${pipeline.name} Output`}
        />
      </DialogContent>
    </Dialog>
  );
}
