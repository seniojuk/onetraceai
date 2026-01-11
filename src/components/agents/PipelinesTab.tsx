import { useState } from "react";
import { Plus, Zap, Search, RefreshCw, Sparkles, Workflow, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PipelineCard } from "./PipelineCard";
import { PipelineBuilder } from "./PipelineBuilder";
import { PipelineRunner } from "./PipelineRunner";
import { PipelineRunHistory } from "./PipelineRunHistory";
import { 
  useAgentPipelines, 
  useCreatePipeline, 
  useUpdatePipeline, 
  useDeletePipeline,
  PIPELINE_TEMPLATES,
  type AgentPipeline,
  type CreatePipelineInput,
  type PipelineStep,
} from "@/hooks/useAgentPipelines";
import type { AgentConfig } from "@/hooks/useAgentConfigs";
import { toast } from "sonner";

interface PipelinesTabProps {
  workspaceId: string;
  projectId?: string;
  agents: AgentConfig[];
}

export function PipelinesTab({ workspaceId, projectId, agents }: PipelinesTabProps) {
  const { data: pipelines, isLoading, refetch } = useAgentPipelines(workspaceId, projectId);
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [searchQuery, setSearchQuery] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<AgentPipeline | null>(null);

  const filteredPipelines = pipelines?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCreatePipeline = async (input: CreatePipelineInput) => {
    await createPipeline.mutateAsync(input);
    toast.success("Pipeline created successfully");
    refetch();
  };

  const handleRunPipeline = (pipeline: AgentPipeline) => {
    setSelectedPipeline(pipeline);
    setIsRunnerOpen(true);
  };

  const handleEditPipeline = (pipeline: AgentPipeline) => {
    setSelectedPipeline(pipeline);
    setIsBuilderOpen(true);
  };

  const handleViewHistory = (pipeline?: AgentPipeline) => {
    setSelectedPipeline(pipeline || null);
    setIsHistoryOpen(true);
  };

  const handleTogglePipeline = async (pipeline: AgentPipeline, active: boolean) => {
    await updatePipeline.mutateAsync({
      id: pipeline.id,
      workspaceId: pipeline.workspace_id,
      is_active: active,
    });
    toast.success(`Pipeline ${active ? "activated" : "deactivated"}`);
  };

  const handleDeletePipeline = async (pipeline: AgentPipeline) => {
    if (!confirm(`Delete "${pipeline.name}"? This cannot be undone.`)) return;
    
    await deletePipeline.mutateAsync({
      id: pipeline.id,
      workspaceId: pipeline.workspace_id,
    });
    toast.success("Pipeline deleted");
  };

  const handleCreateFromTemplate = async (template: typeof PIPELINE_TEMPLATES[0]) => {
    // Find agents matching the template types
    const steps: PipelineStep[] = [];
    for (let i = 0; i < template.agentTypes.length; i++) {
      const agentType = template.agentTypes[i];
      const agent = agents.find(a => a.agent_type === agentType && a.enabled !== false);
      if (!agent) {
        toast.error(`No enabled ${agentType.replace(/_/g, " ")} found. Please add one first.`);
        return;
      }
      steps.push({
        id: crypto.randomUUID(),
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.agent_type,
        inputMapping: i === 0 ? "initial_input" : "previous_output",
        order: i,
      });
    }

    await createPipeline.mutateAsync({
      workspaceId,
      projectId,
      name: template.name,
      description: template.description,
      steps,
    });
    toast.success(`Created "${template.name}" pipeline`);
    refetch();
  };

  const enabledAgents = agents.filter(a => a.enabled !== false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline"
          onClick={() => handleViewHistory()}
        >
          <History className="w-4 h-4 mr-2" />
          Run History
        </Button>
        <Button 
          className="bg-accent hover:bg-accent/90"
          onClick={() => {
            setSelectedPipeline(null);
            setIsBuilderOpen(true);
          }}
          disabled={enabledAgents.length < 2}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {/* Pipeline templates (show when no pipelines exist) */}
      {pipelines?.length === 0 && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="font-medium">Quick Start Templates</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PIPELINE_TEMPLATES.map((template, index) => (
              <Card key={index} className="hover:border-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-accent" />
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.agentTypes.map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {type.replace(/_/g, " ").replace(" AGENT", "")}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleCreateFromTemplate(template)}
                    disabled={createPipeline.isPending}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pipelines grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredPipelines.length === 0 && pipelines && pipelines.length > 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No matching pipelines</h3>
          <p className="text-muted-foreground">
            Try adjusting your search query
          </p>
        </div>
      ) : filteredPipelines.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onRun={handleRunPipeline}
              onEdit={handleEditPipeline}
              onToggle={handleTogglePipeline}
              onDelete={handleDeletePipeline}
            />
          ))}
        </div>
      ) : pipelines?.length === 0 && (
        <div className="text-center py-8 border rounded-lg bg-muted/30 border-dashed">
          <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {enabledAgents.length < 2 
              ? "You need at least 2 enabled agents to create a pipeline"
              : "Create your first pipeline using a template above or the New Pipeline button"}
          </p>
        </div>
      )}

      {/* Dialogs */}
      <PipelineBuilder
        open={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        agents={agents}
        workspaceId={workspaceId}
        projectId={projectId}
        onSave={handleCreatePipeline}
        isLoading={createPipeline.isPending}
        existingPipeline={selectedPipeline || undefined}
      />

      <PipelineRunner
        open={isRunnerOpen}
        onOpenChange={setIsRunnerOpen}
        pipeline={selectedPipeline}
        workspaceId={workspaceId}
        projectId={projectId}
      />

      <PipelineRunHistory
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        workspaceId={workspaceId}
        pipelineId={selectedPipeline?.id}
        pipelineName={selectedPipeline?.name}
      />
    </div>
  );
}
