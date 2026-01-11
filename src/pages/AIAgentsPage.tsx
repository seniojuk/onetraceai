import { useState } from "react";
import { 
  Bot, 
  Plus, 
  Sparkles,
  Grid3X3,
  List,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentConfigDialog } from "@/components/agents/AgentConfigDialog";
import { AgentRunHistory } from "@/components/agents/AgentRunHistory";
import { InvokeAgentDialog } from "@/components/agents/InvokeAgentDialog";
import { 
  useAgentConfigs, 
  useCreateAgentConfig, 
  useUpdateAgentConfig, 
  useDeleteAgentConfig,
  DEFAULT_AGENT_TEMPLATES,
  type AgentConfig,
  type CreateAgentConfigInput
} from "@/hooks/useAgentConfigs";
import { useAIRuns, useCreateAIRun, useUpdateAIRun } from "@/hooks/useAIRuns";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AIAgentsPage = () => {
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  
  // Data hooks
  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useAgentConfigs(
    currentWorkspaceId || undefined, 
    currentProjectId || undefined
  );
  const { data: runs, isLoading: runsLoading } = useAIRuns(
    currentWorkspaceId || undefined,
    currentProjectId || undefined
  );
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  
  // Mutations
  const createAgent = useCreateAgentConfig();
  const updateAgent = useUpdateAgentConfig();
  const deleteAgent = useDeleteAgentConfig();
  const createRun = useCreateAIRun();
  const updateRun = useUpdateAIRun();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isInvokeDialogOpen, setIsInvokeDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filtered agents
  const filteredAgents = agents?.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || agent.agent_type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  // Handlers
  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setIsConfigDialogOpen(true);
  };

  const handleConfigureAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setIsConfigDialogOpen(true);
  };

  const handleInvokeAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setIsInvokeDialogOpen(true);
  };

  const handleToggleAgent = async (agent: AgentConfig, enabled: boolean) => {
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        workspace_id: agent.workspace_id,
        enabled,
      });
      toast.success(`Agent ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update agent");
    }
  };

  const handleDeleteAgent = async (agent: AgentConfig) => {
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    
    try {
      await deleteAgent.mutateAsync({
        id: agent.id,
        workspaceId: agent.workspace_id,
      });
      toast.success("Agent deleted");
    } catch (error) {
      toast.error("Failed to delete agent");
    }
  };

  const handleSaveAgent = async (data: CreateAgentConfigInput) => {
    if (selectedAgent) {
      // Update existing
      await updateAgent.mutateAsync({
        id: selectedAgent.id,
        workspace_id: selectedAgent.workspace_id,
        name: data.name,
        description: data.description || null,
        agent_type: data.agentType,
        persona: data.persona || null,
        system_prompt: data.systemPrompt || null,
        default_model_id: data.defaultModelId || null,
        routing_mode: data.routingMode || null,
        temperature: data.temperature ?? 0.7,
        max_tokens: data.maxTokens || null,
        autonomous_enabled: data.autonomousEnabled ?? false,
        guardrails: data.guardrails || null,
      });
      toast.success("Agent updated");
    } else {
      // Create new
      await createAgent.mutateAsync(data);
      toast.success("Agent created");
    }
  };

  const handleRunAgent = async (params: {
    agentId: string;
    modelId?: string;
    inputContent: string;
    inputArtifactId?: string;
  }) => {
    if (!currentWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }

    const agent = agents?.find(a => a.id === params.agentId);
    if (!agent) {
      toast.error("Agent not found");
      return;
    }

    // Create the run record
    const run = await createRun.mutateAsync({
      workspaceId: currentWorkspaceId,
      projectId: currentProjectId || undefined,
      agentConfigId: params.agentId,
      modelId: params.modelId || agent.default_model_id || undefined,
      runType: "INVOKED",
      inputContext: {
        content: params.inputContent,
        artifactId: params.inputArtifactId,
      },
    });

    // Update to running
    await updateRun.mutateAsync({
      id: run.id,
      workspace_id: currentWorkspaceId,
      status: "RUNNING",
    });

    setIsInvokeDialogOpen(false);
    toast.success("Agent run started");

    // Here you would typically call the actual AI endpoint
    // For now, we'll simulate a completion after a delay
    try {
      // Call appropriate edge function based on agent type
      let endpoint = "";
      let body: Record<string, unknown> = {};

      switch (agent.agent_type) {
        case "PRODUCT_AGENT":
          endpoint = "generate-prd";
          body = { projectDescription: params.inputContent };
          break;
        case "STORY_AGENT":
          endpoint = "generate-stories";
          body = { prdContent: params.inputContent };
          break;
        case "QA_AGENT":
          endpoint = "generate-test-cases";
          body = { acceptanceCriteria: [params.inputContent] };
          break;
        default:
          // For other agents, use a generic approach
          endpoint = "generate-prd";
          body = { projectDescription: params.inputContent };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error("Agent execution failed");
      }

      const result = await response.json();

      await updateRun.mutateAsync({
        id: run.id,
        workspace_id: currentWorkspaceId,
        status: "COMPLETED",
        output_artifacts: [result],
        completed_at: new Date().toISOString(),
      });

      toast.success("Agent run completed!");
    } catch (error) {
      await updateRun.mutateAsync({
        id: run.id,
        workspace_id: currentWorkspaceId,
        status: "FAILED",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      });
      toast.error("Agent run failed");
    }
  };

  const handleSeedDefaultAgents = async () => {
    if (!currentWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }

    setIsSeeding(true);
    try {
      for (const template of DEFAULT_AGENT_TEMPLATES) {
        await createAgent.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId || undefined,
          ...template,
        });
      }
      toast.success(`Created ${DEFAULT_AGENT_TEMPLATES.length} default agents`);
      refetchAgents();
    } catch (error) {
      toast.error("Failed to create default agents");
    } finally {
      setIsSeeding(false);
    }
  };

  const agentTypes = [
    { value: "all", label: "All Types" },
    { value: "PRODUCT_AGENT", label: "Product" },
    { value: "STORY_AGENT", label: "Story" },
    { value: "QA_AGENT", label: "QA" },
    { value: "ARCHITECTURE_AGENT", label: "Architecture" },
    { value: "UX_AGENT", label: "UX" },
    { value: "SECURITY_AGENT", label: "Security" },
    { value: "DOCS_AGENT", label: "Documentation" },
    { value: "CUSTOM_AGENT", label: "Custom" },
  ];

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Bot className="w-8 h-8 text-accent" />
                AI Agents
              </h1>
              <p className="text-muted-foreground">
                Configure and run AI agents for artifact generation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {agents?.length === 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleSeedDefaultAgents}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Add Default Agents
                </Button>
              )}
              <Button 
                className="bg-accent hover:bg-accent/90"
                onClick={handleCreateAgent}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Agent
              </Button>
            </div>
          </div>

          {/* Main content tabs */}
          <Tabs defaultValue="agents" className="space-y-6">
            <TabsList>
              <TabsTrigger value="agents" className="gap-2">
                <Bot className="w-4 h-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="runs" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Run History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Agent grid/list */}
              {agentsLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-16 border rounded-lg bg-muted/30">
                  <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No agents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || typeFilter !== "all" 
                      ? "Try adjusting your filters"
                      : "Create your first agent to get started"}
                  </p>
                  {!searchQuery && typeFilter === "all" && (
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={handleSeedDefaultAgents}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Add Default Agents
                      </Button>
                      <Button onClick={handleCreateAgent}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Agent
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={viewMode === "grid" 
                  ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
                  : "space-y-4"
                }>
                  {filteredAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onConfigure={handleConfigureAgent}
                      onInvoke={handleInvokeAgent}
                      onToggle={handleToggleAgent}
                      onDelete={handleDeleteAgent}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="runs">
              <AgentRunHistory 
                runs={runs || []} 
                isLoading={runsLoading}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <AgentConfigDialog
          open={isConfigDialogOpen}
          onOpenChange={setIsConfigDialogOpen}
          agent={selectedAgent}
          workspaceId={currentWorkspaceId || ""}
          projectId={currentProjectId || undefined}
          onSave={handleSaveAgent}
          isLoading={createAgent.isPending || updateAgent.isPending}
        />

        <InvokeAgentDialog
          open={isInvokeDialogOpen}
          onOpenChange={setIsInvokeDialogOpen}
          agent={selectedAgent}
          artifacts={artifacts}
          onInvoke={handleRunAgent}
          isLoading={createRun.isPending}
        />
      </AppLayout>
    </AuthGuard>
  );
};

export default AIAgentsPage;
