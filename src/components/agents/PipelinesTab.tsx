import { useState } from "react";
import {
  Plus,
  Zap,
  Search,
  History,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const filteredPipelines =
    pipelines?.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleCreatePipeline = async (input: CreatePipelineInput) => {
    await createPipeline.mutateAsync(input);
    toast.success("Pipeline created");
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

  const handleCreateFromTemplate = async (
    template: (typeof PIPELINE_TEMPLATES)[0]
  ) => {
    const steps: PipelineStep[] = [];
    for (let i = 0; i < template.agentTypes.length; i++) {
      const agentType = template.agentTypes[i];
      const agent = agents.find(
        (a) => a.agent_type === agentType && a.enabled !== false
      );
      if (!agent) {
        toast.error(
          `No enabled ${agentType.replace(/_/g, " ")} found. Add one first.`
        );
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
    toast.success(`Created "${template.name}"`);
    refetch();
  };

  const enabledAgents = agents.filter((a) => a.enabled !== false);

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pipelines…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleViewHistory()}>
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              setSelectedPipeline(null);
              setIsBuilderOpen(true);
            }}
            disabled={enabledAgents.length < 2}
          >
            <Plus className="mr-2 h-4 w-4" />
            New pipeline
          </Button>
        </div>
      </div>

      {/* Templates */}
      {pipelines?.length === 0 && !isLoading && (
        <section>
          <div className="mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Quick start
            </h2>
            <p className="mt-1 text-[16px] font-medium tracking-tight text-foreground">
              Chain agents into a workflow
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => handleCreateFromTemplate(template)}
                disabled={createPipeline.isPending}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition hover:border-border/80 disabled:opacity-50"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {template.agentTypes.length} steps
                    </span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-medium tracking-tight text-foreground">
                    {template.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
                    {template.agentTypes.map((type, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {i > 0 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                        )}
                        <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground">
                          {type.replace(/_/g, " ").replace(" AGENT", "")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors group-hover:text-foreground">
                    Use template
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

      )}

      {/* Pipelines */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : filteredPipelines.length === 0 && pipelines && pipelines.length > 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          No pipelines match "{searchQuery}".
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
      ) : pipelines?.length === 0 && enabledAgents.length < 2 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Pipelines chain agents together. Enable at least two agents to start.
          </p>
        </div>
      ) : null}

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
        projectId={projectId}
        pipelineId={selectedPipeline?.id}
        pipelineName={selectedPipeline?.name}
      />
    </div>
  );
}
