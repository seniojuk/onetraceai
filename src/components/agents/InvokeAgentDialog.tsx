import { useState, useEffect } from "react";
import { Loader2, Play, FileText, Bot, Brain, Sparkles, StopCircle, RotateCcw } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StreamingOutput } from "./StreamingOutput";
import { useAgentStream } from "@/hooks/useAgentStream";
import type { AgentConfig } from "@/hooks/useAgentConfigs";
import type { Artifact } from "@/hooks/useArtifacts";
import { useAllModels } from "@/hooks/useLLMModels";
import { useUIStore } from "@/store/uiStore";

interface InvokeAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentConfig | null;
  artifacts?: Artifact[];
  onInvoke: (params: {
    agentId: string;
    modelId?: string;
    inputContent: string;
    inputArtifactId?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function InvokeAgentDialog({
  open,
  onOpenChange,
  agent,
  artifacts = [],
  onInvoke,
  isLoading,
}: InvokeAgentDialogProps) {
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const { data: models } = useAllModels();
  const stream = useAgentStream();
  
  const [inputMode, setInputMode] = useState<"manual" | "artifact">("manual");
  const [inputContent, setInputContent] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [useStreaming, setUseStreaming] = useState(true);

  // Reset stream state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      stream.reset();
    }
  }, [open]);

  if (!agent) return null;

  const handleInvoke = async () => {
    const content = inputMode === "manual" 
      ? inputContent 
      : artifacts.find(a => a.id === selectedArtifact)?.content_markdown || "";

    if (useStreaming && currentWorkspaceId) {
      // Use streaming mode
      await stream.startStream({
        agentId: agent.id,
        modelId: selectedModel || agent.default_model_id || undefined,
        inputContent: content,
        inputArtifactId: inputMode === "artifact" ? selectedArtifact : undefined,
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId || undefined,
      });
    } else {
      // Use non-streaming mode (original behavior)
      await onInvoke({
        agentId: agent.id,
        modelId: selectedModel || agent.default_model_id || undefined,
        inputContent: content,
        inputArtifactId: inputMode === "artifact" ? selectedArtifact : undefined,
      });

      // Reset form
      setInputContent("");
      setSelectedArtifact("");
      setSelectedModel("");
      setInputMode("manual");
    }
  };

  const handleReset = () => {
    stream.reset();
    setInputContent("");
    setSelectedArtifact("");
  };

  const canInvoke = inputMode === "manual" 
    ? inputContent.trim().length > 0 
    : selectedArtifact.length > 0;

  const isRunning = stream.isStreaming || isLoading;
  const hasResult = stream.result !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Run {agent.name}
          </DialogTitle>
          <DialogDescription>
            {agent.description || "Invoke this agent with input content"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Sparkles className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <div className="text-sm font-medium">Agent Type</div>
              <div className="text-xs text-muted-foreground">
                {agent.agent_type.replace(/_/g, " ")}
              </div>
            </div>
            {agent.autonomous_enabled && (
              <Badge variant="secondary">Autonomous</Badge>
            )}
          </div>

          {/* Show streaming output if running or completed */}
          {(stream.isStreaming || stream.content || stream.error) ? (
            <StreamingOutput state={stream} />
          ) : (
            <>
              {/* Model selection and streaming toggle */}
              <div className="flex items-center gap-4">
                {agent.routing_mode !== "LOCKED" && (
                  <div className="flex-1 space-y-2">
                    <Label>Model</Label>
                    <Select 
                      value={selectedModel || agent.default_model_id || ""} 
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Use default model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              <span>{model.display_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({model.provider?.display_name})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="streaming"
                    checked={useStreaming}
                    onCheckedChange={setUseStreaming}
                  />
                  <Label htmlFor="streaming" className="text-sm cursor-pointer">
                    Stream output
                  </Label>
                </div>
              </div>

              {/* Input tabs */}
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "manual" | "artifact")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  <TabsTrigger value="artifact">From Artifact</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-2 mt-4">
                  <Label>Input Content</Label>
                  <Textarea
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder="Enter your input content here..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="artifact" className="space-y-2 mt-4">
                  <Label>Select Artifact</Label>
                  <Select value={selectedArtifact} onValueChange={setSelectedArtifact}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an artifact..." />
                    </SelectTrigger>
                    <SelectContent>
                      {artifacts.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No artifacts found
                        </div>
                      ) : (
                        artifacts.map((artifact) => (
                          <SelectItem key={artifact.id} value={artifact.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="font-mono text-xs text-muted-foreground">
                                {artifact.short_id}
                              </span>
                              <span className="truncate">{artifact.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {artifact.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>

              {/* Persona preview */}
              {agent.persona && (
                <div className="p-3 rounded-lg border border-dashed">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Agent Persona
                  </div>
                  <p className="text-sm line-clamp-2">{agent.persona}</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasResult && (
            <Button variant="outline" onClick={handleReset} className="mr-auto">
              <RotateCcw className="w-4 h-4 mr-2" />
              New Run
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {hasResult ? "Close" : "Cancel"}
          </Button>
          {stream.isStreaming ? (
            <Button 
              variant="destructive"
              onClick={stream.stopStream}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : !hasResult && (
            <Button 
              onClick={handleInvoke} 
              disabled={!canInvoke || isRunning}
              className="bg-accent hover:bg-accent/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
