import { useState, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ArrowRight, 
  Bot,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentConfig } from "@/hooks/useAgentConfigs";
import type { PipelineStep, CreatePipelineInput } from "@/hooks/useAgentPipelines";

interface PipelineBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentConfig[];
  workspaceId: string;
  projectId?: string;
  onSave: (pipeline: CreatePipelineInput) => Promise<void>;
  isLoading?: boolean;
  existingPipeline?: {
    id: string;
    name: string;
    description: string | null;
    steps: PipelineStep[];
  };
}

export function PipelineBuilder({
  open,
  onOpenChange,
  agents,
  workspaceId,
  projectId,
  onSave,
  isLoading,
  existingPipeline,
}: PipelineBuilderProps) {
  const [name, setName] = useState(existingPipeline?.name || "");
  const [description, setDescription] = useState(existingPipeline?.description || "");
  const [steps, setSteps] = useState<PipelineStep[]>(existingPipeline?.steps || []);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const enabledAgents = useMemo(() => 
    agents.filter(a => a.enabled !== false), 
    [agents]
  );

  const addStep = () => {
    if (enabledAgents.length === 0) return;
    
    const firstAgent = enabledAgents[0];
    const newStep: PipelineStep = {
      id: crypto.randomUUID(),
      agentId: firstAgent.id,
      agentName: firstAgent.name,
      agentType: firstAgent.agent_type,
      inputMapping: steps.length === 0 ? "initial_input" : "previous_output",
      order: steps.length,
    };
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
  };

  const updateStep = (stepId: string, updates: Partial<PipelineStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    const index = steps.findIndex(s => s.id === stepId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
  };

  const handleAgentChange = (stepId: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      updateStep(stepId, {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.agent_type,
      });
    }
  };

  const handleSave = async () => {
    await onSave({
      workspaceId,
      projectId,
      name,
      description,
      steps,
    });
    onOpenChange(false);
    // Reset form
    setName("");
    setDescription("");
    setSteps([]);
  };

  const canSave = name.trim() && steps.length >= 2;

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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            {existingPipeline ? "Edit Pipeline" : "Create Agent Pipeline"}
          </DialogTitle>
          <DialogDescription>
            Chain multiple agents together to create automated workflows
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pipeline metadata */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pipeline Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., PRD → Stories → Test Cases"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this pipeline does..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          {/* Pipeline steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Pipeline Steps</Label>
              <Badge variant="outline">{steps.length} steps</Badge>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/30 border-dashed">
                <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  No steps added yet. Add at least 2 agents to create a pipeline.
                </p>
                <Button onClick={addStep} size="sm" disabled={enabledAgents.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Step
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={step.id} className="relative">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveStep(step.id, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveStep(step.id, "down")}
                            disabled={index === steps.length - 1}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <Badge className="font-mono">Step {index + 1}</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          
                          <Select
                            value={step.agentId}
                            onValueChange={(v) => handleAgentChange(step.id, v)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {enabledAgents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  <div className="flex items-center gap-2">
                                    <Bot className="w-3 h-3" />
                                    <span>{agent.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Badge 
                            variant="outline" 
                            className={getAgentTypeColor(step.agentType)}
                          >
                            {step.agentType.replace(/_/g, " ").replace(" AGENT", "")}
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="py-3 px-4 pt-0 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Input Source</Label>
                          <Select
                            value={step.inputMapping}
                            onValueChange={(v) => updateStep(step.id, { 
                              inputMapping: v as PipelineStep["inputMapping"] 
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="initial_input">
                                Use Initial Input
                              </SelectItem>
                              {index > 0 && (
                                <SelectItem value="previous_output">
                                  Output from Step {index}
                                </SelectItem>
                              )}
                              <SelectItem value="custom">
                                Custom Prompt + Context
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {step.inputMapping === "custom" && (
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs">Custom Prompt</Label>
                            <Textarea
                              value={step.customPrompt || ""}
                              onChange={(e) => updateStep(step.id, { customPrompt: e.target.value })}
                              placeholder="Additional instructions for this step. Use {{previous_output}} to reference the previous step's output."
                              className="min-h-[60px] text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add step button */}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addStep}
                  disabled={enabledAgents.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            )}
          </div>

          {/* Visual flow preview */}
          {steps.length >= 2 && (
            <div className="p-4 rounded-lg bg-muted/30 border">
              <Label className="text-xs text-muted-foreground mb-3 block">
                Pipeline Flow Preview
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">Input</Badge>
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge className={getAgentTypeColor(step.agentType)}>
                      {step.agentName}
                    </Badge>
                  </div>
                ))}
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">Output</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave || isLoading}
            className="bg-accent hover:bg-accent/90"
          >
            {isLoading ? "Saving..." : existingPipeline ? "Update Pipeline" : "Create Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
