import { useMemo, useState } from "react";
import {
  Bot,
  Plus,
  Sparkles,
  Search,
  RefreshCw,
  Store,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentConfigDialog } from "@/components/agents/AgentConfigDialog";
import { AgentRunHistory } from "@/components/agents/AgentRunHistory";
import { InvokeAgentDialog } from "@/components/agents/InvokeAgentDialog";
import { AgentMarketplace, type AgentTemplate } from "@/components/agents/AgentMarketplace";
import { PipelinesTab } from "@/components/agents/PipelinesTab";
import {
  useAgentConfigs,
  useCreateAgentConfig,
  useUpdateAgentConfig,
  useDeleteAgentConfig,
  DEFAULT_AGENT_TEMPLATES,
  type AgentConfig,
  type AgentType,
  type CreateAgentConfigInput,
} from "@/hooks/useAgentConfigs";
import { useAIRuns, useCreateAIRun, useUpdateAIRun } from "@/hooks/useAIRuns";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "AGENTS" | "PIPELINES" | "MARKETPLACE" | "RUNS";

// Domain grouping — how agents organize in a user's head, not in a database.
const DOMAIN_GROUPS: { key: string; label: string; caption: string; types: AgentType[] }[] = [
  {
    key: "product",
    label: "Define",
    caption: "Shape what gets built",
    types: ["PRODUCT_AGENT", "STORY_AGENT", "UX_AGENT"],
  },
  {
    key: "build",
    label: "Build",
    caption: "Turn intent into artifacts",
    types: ["ARCHITECTURE_AGENT", "DEV_AGENT", "DOCS_AGENT"],
  },
  {
    key: "verify",
    label: "Verify",
    caption: "Catch problems before they ship",
    types: ["QA_AGENT", "SECURITY_AGENT", "DRIFT_AGENT"],
  },
  {
    key: "operate",
    label: "Operate",
    caption: "Keep the system honest",
    types: ["RELEASE_AGENT", "INTEGRATION_AGENT", "CUSTOM_AGENT"],
  },
];

const AIAgentsPage = () => {
  const { currentProjectId, currentWorkspaceId } = useUIStore();

  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useAgentConfigs(
    currentWorkspaceId || undefined,
    currentProjectId || undefined
  );
  const { data: runs, isLoading: runsLoading } = useAIRuns(
    currentWorkspaceId || undefined,
    currentProjectId || undefined
  );
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);

  const createAgent = useCreateAgentConfig();
  const updateAgent = useUpdateAgentConfig();
  const deleteAgent = useDeleteAgentConfig();
  const createRun = useCreateAIRun();
  const updateRun = useUpdateAIRun();

  const [tab, setTab] = useState<Tab>("AGENTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isInvokeDialogOpen, setIsInvokeDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // ---- Live activity stats (mirrors Drift's severity strip language) ----
  const activity = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todays = (runs || []).filter(
      (r) => new Date(r.created_at || 0).getTime() >= startOfDay.getTime()
    );
    return {
      running: (runs || []).filter((r) => r.status === "RUNNING").length,
      completed: todays.filter((r) => r.status === "COMPLETED").length,
      failed: todays.filter((r) => r.status === "FAILED").length,
    };
  }, [runs]);

  const enabledCount = (agents || []).filter((a) => a.enabled).length;
  const totalAgents = (agents || []).length;

  const filteredAgents = (agents || []).filter((agent) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.description?.toLowerCase().includes(q) ||
      agent.agent_type.toLowerCase().includes(q)
    );
  });

  const grouped = useMemo(() => {
    const byType = new Map<AgentType, AgentConfig[]>();
    for (const a of filteredAgents) {
      const arr = byType.get(a.agent_type) || [];
      arr.push(a);
      byType.set(a.agent_type, arr);
    }
    return DOMAIN_GROUPS.map((g) => ({
      ...g,
      items: g.types.flatMap((t) => byType.get(t) || []),
    })).filter((g) => g.items.length > 0);
  }, [filteredAgents]);

  // ---- Recent activity (last 4 runs, for the activity rail) ----
  const recentRuns = useMemo(() => (runs || []).slice(0, 4), [runs]);
  const agentById = useMemo(() => {
    const m = new Map<string, AgentConfig>();
    (agents || []).forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  // ===================== Handlers (unchanged behavior) =====================
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
    } catch {
      toast.error("Failed to update agent");
    }
  };

  const handleDeleteAgent = async (agent: AgentConfig) => {
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    try {
      await deleteAgent.mutateAsync({ id: agent.id, workspaceId: agent.workspace_id });
      toast.success("Agent deleted");
    } catch {
      toast.error("Failed to delete agent");
    }
  };

  const handleSaveAgent = async (data: CreateAgentConfigInput) => {
    if (selectedAgent) {
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
    const agent = agents?.find((a) => a.id === params.agentId);
    if (!agent) {
      toast.error("Agent not found");
      return;
    }
    const run = await createRun.mutateAsync({
      workspaceId: currentWorkspaceId,
      projectId: currentProjectId || undefined,
      agentConfigId: params.agentId,
      modelId: params.modelId || agent.default_model_id || undefined,
      runType: "INVOKED",
      inputContext: { content: params.inputContent, artifactId: params.inputArtifactId },
    });
    await updateRun.mutateAsync({
      id: run.id,
      workspace_id: currentWorkspaceId,
      status: "RUNNING",
    });
    setIsInvokeDialogOpen(false);
    toast.success("Agent run started");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            agentId: params.agentId,
            modelId: params.modelId,
            inputContent: params.inputContent,
            inputArtifactId: params.inputArtifactId,
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Agent execution failed");
      }
      const result = await response.json();
      await updateRun.mutateAsync({
        id: run.id,
        workspace_id: currentWorkspaceId,
        status: "COMPLETED",
        output_artifacts: [result.parsedOutput || result.content],
        input_tokens: result.usage?.inputTokens || 0,
        output_tokens: result.usage?.outputTokens || 0,
        total_cost: result.usage?.estimatedCost || 0,
        duration_ms: result.metadata?.durationMs || 0,
        completed_at: new Date().toISOString(),
      });
      toast.success(`${result.agentName} completed successfully!`);
    } catch (error) {
      await updateRun.mutateAsync({
        id: run.id,
        workspace_id: currentWorkspaceId,
        status: "FAILED",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      });
      toast.error(error instanceof Error ? error.message : "Agent run failed");
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
    } catch {
      toast.error("Failed to create default agents");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCloneTemplate = async (template: AgentTemplate) => {
    if (!currentWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }
    try {
      await createAgent.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId || undefined,
        name: template.name,
        agentType: template.agentType,
        description: template.description,
        persona: template.persona,
        systemPrompt: template.systemPrompt,
        guardrails: template.guardrails,
      });
      toast.success(`${template.name} added to your agents`);
      refetchAgents();
    } catch {
      toast.error("Failed to clone agent template");
    }
  };

  // ===================== Render helpers =====================
  const statusDot = (
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        activity.running > 0
          ? "bg-accent animate-pulse"
          : enabledCount > 0
            ? "bg-accent"
            : "bg-muted-foreground/40"
      )}
    />
  );

  const heroLine =
    totalAgents === 0
      ? "No agents yet. Seed the defaults or build your own."
      : activity.running > 0
        ? `${activity.running} agent${activity.running === 1 ? "" : "s"} working right now.`
        : activity.failed > 0
          ? `${activity.failed} run${activity.failed === 1 ? "" : "s"} failed today. Worth a look.`
          : `${enabledCount} of ${totalAgents} agents standing by. Pick one and go.`;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
          {/* Hero */}
          <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {statusDot}
                {activity.running > 0
                  ? "Working"
                  : enabledCount > 0
                    ? "Ready"
                    : "Idle"}
              </p>
              <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
                Agents
              </h1>
              <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
                {heroLine}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {totalAgents === 0 && (
                <Button variant="outline" onClick={handleSeedDefaultAgents} disabled={isSeeding}>
                  {isSeeding ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Seed defaults
                </Button>
              )}
              <Button variant="accent" onClick={handleCreateAgent}>
                <Plus className="mr-2 h-4 w-4" />
                New agent
              </Button>
            </div>
          </header>

          {/* Activity strip — running / completed today / failed today */}
          {totalAgents > 0 && (
            <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
              {[
                {
                  k: "running",
                  label: "Running",
                  n: activity.running,
                  dot: "bg-accent",
                  pulse: activity.running > 0,
                  onClick: () => setTab("RUNS"),
                },
                {
                  k: "completed",
                  label: "Completed today",
                  n: activity.completed,
                  dot: "bg-accent",
                  pulse: false,
                  onClick: () => setTab("RUNS"),
                },
                {
                  k: "failed",
                  label: "Failed today",
                  n: activity.failed,
                  dot: activity.failed > 0 ? "bg-drift" : "bg-muted-foreground/40",
                  pulse: false,
                  onClick: () => setTab("RUNS"),
                },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={s.onClick}
                  className="group flex flex-col items-start gap-1 bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 rounded-full", s.dot, s.pulse && "animate-pulse")}
                    />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                    {s.n}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <div className="flex overflow-x-auto">
              {(
                [
                  { k: "AGENTS", label: "Agents", icon: Bot, n: totalAgents },
                  { k: "PIPELINES", label: "Pipelines", icon: Zap },
                  { k: "MARKETPLACE", label: "Marketplace", icon: Store },
                  { k: "RUNS", label: "Run history", icon: History, n: (runs || []).length },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={cn(
                      "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      tab === t.k
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                    {"n" in t && t.n !== undefined && (
                      <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                        {t.n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          {tab === "AGENTS" && (
            <div className="space-y-10">
              {/* Search */}
              {totalAgents > 0 && (
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, role, or type…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {agentsLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : totalAgents === 0 ? (
                <EmptyState
                  title="No agents yet."
                  body="Agents read your artifacts and write new ones — PRDs, stories, tests, docs. Start from a battle-tested set or build one from scratch."
                  primary={{
                    label: "Seed default agents",
                    onClick: handleSeedDefaultAgents,
                    icon: Sparkles,
                  }}
                  secondary={{
                    label: "Build my own",
                    onClick: handleCreateAgent,
                    icon: Plus,
                  }}
                />
              ) : filteredAgents.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    No agents match "{searchQuery}".
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {grouped.map((g) => (
                    <section key={g.key}>
                      <div className="mb-4 flex items-baseline justify-between gap-3">
                        <div>
                          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {g.label}
                          </h2>
                          <p className="mt-1 font-display text-xl font-semibold text-foreground">
                            {g.caption}
                          </p>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                          {g.items.length} agent{g.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {g.items.map((agent) => (
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
                    </section>
                  ))}
                </div>
              )}

              {/* Recent activity rail */}
              {recentRuns.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Recent activity
                    </h2>
                    <button
                      onClick={() => setTab("RUNS")}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Full history
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {recentRuns.map((r) => {
                      const agent = r.agent_config_id ? agentById.get(r.agent_config_id) : null;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setTab("RUNS")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                        >
                          <RunStatusIcon status={r.status} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {agent?.name || "Unknown agent"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.run_type.toLowerCase()} ·{" "}
                              {relativeTime(r.created_at)}
                              {r.error_message ? ` · ${r.error_message}` : ""}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === "PIPELINES" && (
            <PipelinesTab
              workspaceId={currentWorkspaceId || ""}
              projectId={currentProjectId || undefined}
              agents={agents || []}
            />
          )}

          {tab === "MARKETPLACE" && (
            <AgentMarketplace
              onCloneTemplate={handleCloneTemplate}
              existingAgentTypes={agents?.map((a) => a.agent_type) || []}
              isLoading={createAgent.isPending}
            />
          )}

          {tab === "RUNS" && (
            <AgentRunHistory
              runs={runs || []}
              isLoading={runsLoading}
              workspaceId={currentWorkspaceId || ""}
              projectId={currentProjectId || undefined}
            />
          )}
        </div>

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

// ===================== Small presentational helpers =====================
function RunStatusIcon({ status }: { status: string }) {
  if (status === "RUNNING")
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />;
  if (status === "COMPLETED")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />;
  if (status === "FAILED")
    return <XCircle className="h-4 w-4 shrink-0 text-drift" />;
  return <Play className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function EmptyState({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; onClick: () => void; icon: React.ElementType };
  secondary?: { label: string; onClick: () => void; icon: React.ElementType };
}) {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary?.icon;
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
        <Bot className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="accent" onClick={primary.onClick}>
          <PrimaryIcon className="mr-2 h-4 w-4" />
          {primary.label}
        </Button>
        {secondary && SecondaryIcon && (
          <Button variant="outline" onClick={secondary.onClick}>
            <SecondaryIcon className="mr-2 h-4 w-4" />
            {secondary.label}
          </Button>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default AIAgentsPage;
