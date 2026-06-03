import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  AlertTriangle,
  Sparkles,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Network,
  GitBranch,
  BarChart3,
  Wand2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { UsageDashboardWidget } from "@/components/billing/UsageDashboardWidget";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useCoverageSnapshots } from "@/hooks/useCoverage";
import { useDriftFindings } from "@/hooks/useDriftFindings";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId, setShowOnboarding, setCurrentWorkspace } = useUIStore();
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: projects, isLoading: loadingProjects } = useProjects(currentWorkspaceId || undefined);
  const { data: artifacts, isLoading: loadingArtifacts } = useArtifacts(currentProjectId || undefined);
  const { projectAtLimit, projectWarning, usage } = useUsageLimits();
  const { data: snapshots } = useCoverageSnapshots(currentProjectId || undefined);
  const { data: driftFindings } = useDriftFindings(currentProjectId || undefined);

  useEffect(() => {
    if (!loadingWorkspaces && workspaces) {
      if (workspaces.length === 0) {
        setShowOnboarding(true);
        navigate("/onboarding");
      } else if (!currentWorkspaceId) {
        setCurrentWorkspace(workspaces[0].id);
      }
    }
  }, [workspaces, loadingWorkspaces, currentWorkspaceId, setShowOnboarding, setCurrentWorkspace, navigate]);

  const currentProject = projects?.find((p) => p.id === currentProjectId);

  const stats = useMemo(() => {
    const storyCount = artifacts?.filter((a) => a.type === "STORY").length || 0;
    const acCount = artifacts?.filter((a) => a.type === "ACCEPTANCE_CRITERION").length || 0;
    const inProgressCount = artifacts?.filter((a) => a.status === "IN_PROGRESS").length || 0;
    const doneCount = artifacts?.filter((a) => a.status === "DONE").length || 0;

    const hasSnapshots = (snapshots || []).length > 0;
    let totalACs = 0;
    let satisfiedACs = 0;
    if (hasSnapshots) {
      for (const s of snapshots!) {
        totalACs += s.total_acs;
        satisfiedACs += s.satisfied_acs;
      }
    } else {
      totalACs = acCount;
      satisfiedACs = doneCount;
    }
    const coveragePercent = totalACs > 0 ? Math.round((satisfiedACs / totalACs) * 100) : 0;
    const openDrift = driftFindings?.filter((f) => f.status === "OPEN") || [];

    return {
      storyCount,
      acCount,
      inProgressCount,
      doneCount,
      totalACs,
      satisfiedACs,
      coveragePercent,
      openDrift,
      hasSnapshots,
    };
  }, [artifacts, snapshots, driftFindings]);

  if (loadingWorkspaces || loadingProjects) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  // Build the "needs you" feed: open drift, then in-progress stories, then recent artifacts
  const needsYouItems = [
    ...stats.openDrift.slice(0, 5).map((f) => ({
      kind: "drift" as const,
      id: f.id,
      title: f.title,
      meta: f.description,
      severity: f.severity,
      onClick: () => navigate("/drift"),
    })),
    ...(artifacts || [])
      .filter((a) => a.status === "IN_PROGRESS")
      .slice(0, 5)
      .map((a) => ({
        kind: "in-progress" as const,
        id: a.id,
        title: a.title,
        meta: `${a.short_id} · ${a.type.replace("_", " ")}`,
        severity: undefined,
        onClick: () => navigate(`/artifacts/${a.id}`),
      })),
  ].slice(0, 8);

  const storyCoverage = stats.hasSnapshots
    ? (artifacts?.filter((a) => a.type === "STORY") || [])
        .map((story) => {
          const snap = snapshots?.find((s) => s.artifact_id === story.id);
          const cov = snap ? Math.round((snap.coverage_ratio ?? 0) * 100) : 0;
          return { id: story.id, name: story.title, coverage: cov, total: snap?.total_acs || 0, satisfied: snap?.satisfied_acs || 0 };
        })
        .sort((a, b) => a.coverage - b.coverage)
        .slice(0, 5)
    : [];

  const recentArtifacts = (artifacts || []).slice(0, 5);

  return (
    <AuthGuard>
      <AppLayout>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
          {/* Header */}
          <div className="flex items-start sm:items-end justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium mb-1">
                {currentProject ? `Project · ${currentProject.project_key}` : "Dashboard"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
                {currentProject?.name || "Dashboard"}
              </h1>
            </div>

            {currentProject && (
              <div className="flex items-center gap-1 -mx-1 px-1 overflow-x-auto sm:overflow-visible scrollbar-none max-w-full">
                <QuickAction icon={FileText} label="New PRD" onClick={() => navigate("/artifacts/new?type=PRD")} />
                <QuickAction icon={Sparkles} label="Generate stories" onClick={() => navigate("/ai-runs/new?type=story")} />
                <QuickAction icon={Wand2} label="Prompt gen" onClick={() => navigate("/prompt-generator")} />
                <QuickAction icon={GitBranch} label="Graph" onClick={() => navigate("/graph")} />
              </div>
            )}
          </div>


          {!currentProject ? (
            <EmptyState
              projectAtLimit={projectAtLimit}
              projectWarning={projectWarning}
              usage={usage}
              onCreate={() => navigate("/onboarding?step=create-project")}
              onUpgrade={() => navigate("/billing")}
            />
          ) : (
            <>
              {/* Pulse strip */}
              <section className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
                  <PulseMetric
                    label="Coverage"
                    value={`${stats.coveragePercent}%`}
                    sub={`${stats.satisfiedACs}/${stats.totalACs} ACs satisfied`}
                    tone={stats.coveragePercent >= 80 ? "good" : stats.coveragePercent >= 50 ? "warn" : "bad"}
                  />
                  <PulseMetric
                    label="Open drift"
                    value={stats.openDrift.length.toString()}
                    sub={stats.openDrift.length === 0 ? "Nothing to review" : "Findings to triage"}
                    tone={stats.openDrift.length === 0 ? "good" : "warn"}
                  />
                  <PulseMetric
                    label="In flight"
                    value={stats.inProgressCount.toString()}
                    sub={`of ${stats.storyCount} stories`}
                    tone="neutral"
                  />
                  <PulseMetric
                    label="Acceptance criteria"
                    value={stats.acCount.toString()}
                    sub={`${stats.doneCount} completed`}
                    tone="neutral"
                  />
                </div>
              </section>

              {/* What needs you + Momentum */}
              <div className="grid lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 border border-border rounded-xl bg-card">
                  <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      <h2 className="text-[13px] font-semibold text-foreground">What needs you</h2>
                      <span className="text-[11px] text-muted-foreground">· {needsYouItems.length}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => navigate("/drift")}>
                      All drift <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </header>
                  <div className="divide-y divide-border">
                    {needsYouItems.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2 opacity-60" />
                        <p className="text-sm text-foreground font-medium">All clear</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No drift, no stale work in progress.</p>
                      </div>
                    ) : (
                      needsYouItems.map((item) => (
                        <button
                          key={`${item.kind}-${item.id}`}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-muted/40 transition-colors text-left group"
                        >
                          <SeverityDot kind={item.kind} severity={item.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                            {item.meta && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.meta}</p>
                            )}
                          </div>
                          <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium whitespace-nowrap">
                            {item.kind === "drift" ? "Drift" : "In progress"}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="border border-border rounded-xl bg-card">
                  <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                      <h2 className="text-[13px] font-semibold text-foreground">Lowest coverage</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => navigate("/coverage")}>
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </header>
                  <div className="p-5">
                    {storyCoverage.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-xs text-muted-foreground mb-2">No coverage data yet.</p>
                        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => navigate("/coverage")}>
                          Run analysis
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-3.5">
                        {storyCoverage.map((s) => (
                          <li key={s.id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-medium text-foreground truncate flex-1">{s.name}</span>
                              <span
                                className={cn(
                                  "text-[11px] font-mono tabular-nums tracking-tight",
                                  s.coverage === 100 ? "text-coverage-full" : s.coverage >= 70 ? "text-coverage-partial" : "text-coverage-none"
                                )}
                              >
                                {s.coverage}%
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  s.coverage === 100 ? "bg-coverage-full" : s.coverage >= 70 ? "bg-coverage-partial" : "bg-coverage-none"
                                )}
                                style={{ width: `${Math.max(s.coverage, 2)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{s.satisfied}/{s.total} ACs</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>

              {/* Recent artifacts */}
              <section className="border border-border rounded-xl bg-card">
                <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <h2 className="text-[13px] font-semibold text-foreground">Recent artifacts</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => navigate("/artifacts")}>
                    View all <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </header>
                {loadingArtifacts ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : recentArtifacts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-foreground font-medium mb-1">No artifacts yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Start with a PRD or generate stories from an idea.</p>
                    <Button size="sm" onClick={() => navigate("/artifacts/new")} className="h-8 text-[12px]">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create artifact
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recentArtifacts.map((artifact) => (
                      <li key={artifact.id}>
                        <button
                          onClick={() => navigate(`/artifacts/${artifact.id}`)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left group"
                        >
                          <ArtifactTypeChip type={artifact.type} />
                          <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0">{artifact.short_id}</span>
                          <span className="flex-1 text-[13px] text-foreground truncate">{artifact.title}</span>
                          <StatusDot status={artifact.status} />
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Usage */}
              <UsageDashboardWidget />
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

// ─── Subcomponents ──────────────────────────────────────────────────────────

function PulseMetric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    good: "text-coverage-full",
    warn: "text-coverage-partial",
    bad: "text-coverage-none",
    neutral: "text-foreground",
  }[tone];

  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium mb-1.5">
        {label}
      </div>
      <div className={cn("text-[28px] font-semibold tracking-tight leading-none tabular-nums", toneClass)}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" className="h-8 text-[12px] text-muted-foreground hover:text-foreground" onClick={onClick}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}

function SeverityDot({ kind, severity }: { kind: "drift" | "in-progress"; severity?: number }) {
  if (kind === "in-progress") {
    return <div className="w-1.5 h-1.5 rounded-full bg-coverage-partial shrink-0 animate-pulse" />;
  }
  const color =
    severity === 3 ? "bg-destructive" : severity === 2 ? "bg-drift" : "bg-muted-foreground/40";
  return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />;
}

function ArtifactTypeChip({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PRD: { label: "PRD", cls: "bg-status-prd/10 text-status-prd-fg border-status-prd/20" },
    EPIC: { label: "Epic", cls: "bg-status-epic/10 text-status-epic-fg border-status-epic/20" },
    STORY: { label: "Story", cls: "bg-status-story/10 text-status-story-fg border-status-story/20" },
    ACCEPTANCE_CRITERION: { label: "AC", cls: "bg-status-ac/10 text-status-ac-fg border-status-ac/20" },
    TEST_CASE: { label: "Test", cls: "bg-status-test/10 text-status-test-fg border-status-test/20" },
  };
  const m = map[type] || { label: type, cls: "bg-status-commit/10 text-status-commit-fg border-status-commit/20" };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", m.cls)}>
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "DONE" ? "bg-coverage-full" :
    status === "IN_PROGRESS" ? "bg-coverage-partial animate-pulse" :
    status === "BLOCKED" ? "bg-destructive" :
    status === "ACTIVE" ? "bg-accent" :
    "bg-muted-foreground/30";
  return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />;
}

function EmptyState({
  projectAtLimit,
  projectWarning,
  usage,
  onCreate,
  onUpgrade,
}: {
  projectAtLimit: boolean;
  projectWarning: boolean;
  usage: ReturnType<typeof useUsageLimits>["usage"];
  onCreate: () => void;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
        <Network className="w-7 h-7 text-accent" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1.5">No project selected</h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        Create your first project to start building traceable software with AI assistance.
      </p>

      {projectAtLimit && (
        <Alert className="border-destructive/50 bg-destructive/5 mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-destructive text-sm">
              Project limit reached ({usage?.projects.used}/{usage?.projects.limit}).
            </span>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10 ml-2" onClick={onUpgrade}>
              Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {projectWarning && !projectAtLimit && usage?.projects && (
        <Alert className="border-drift/50 bg-drift/5 mb-4 max-w-md">
          <Sparkles className="h-4 w-4 text-drift" />
          <AlertDescription className="text-drift text-sm">
            Approaching project limit ({usage.projects.used}/{usage.projects.limit} used).
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={onCreate} disabled={projectAtLimit} className="h-9">
        <Plus className="w-4 h-4 mr-2" />
        {projectAtLimit ? "Limit reached" : "Create project"}
      </Button>
    </div>
  );
}

export default Dashboard;
