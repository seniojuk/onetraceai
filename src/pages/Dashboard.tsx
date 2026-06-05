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

  const heroState = useMemo(() => {
    if (!currentProject) {
      return { pillLabel: "No project", dotClass: "bg-muted-foreground/40", pulse: false, subline: "Create a project to start tracing what gets built." };
    }
    if (stats.openDrift.length > 0) {
      return {
        pillLabel: "Drift detected",
        dotClass: "bg-drift",
        pulse: true,
        subline: `${stats.openDrift.length} drift finding${stats.openDrift.length === 1 ? "" : "s"} to triage${stats.inProgressCount ? `, ${stats.inProgressCount} in flight` : ""}.`,
      };
    }
    if (stats.inProgressCount > 0) {
      return {
        pillLabel: "In flight",
        dotClass: "bg-coverage-partial",
        pulse: true,
        subline: `${stats.inProgressCount} stor${stats.inProgressCount === 1 ? "y" : "ies"} in progress. Coverage at ${stats.coveragePercent}%.`,
      };
    }
    return {
      pillLabel: "All clear",
      dotClass: "bg-accent",
      pulse: false,
      subline: `Coverage at ${stats.coveragePercent}%. Nothing pressing — pick what to build next.`,
    };
  }, [currentProject, stats]);

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
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12 space-y-8 sm:space-y-10">
          {/* Hero */}
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", heroState.dotClass, heroState.pulse && "animate-pulse")} />
                {heroState.pillLabel}
              </p>
              <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
                {currentProject?.name || "Dashboard"}
              </h1>
              <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
                {heroState.subline}
              </p>
              {currentProject && (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {currentProject.project_key}
                </p>
              )}
            </div>

            {currentProject && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" className="h-9 text-[12px] text-muted-foreground hover:text-foreground" onClick={() => navigate("/graph")}>
                  <GitBranch className="mr-1.5 h-3.5 w-3.5" /> Graph
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-[12px] text-muted-foreground hover:text-foreground" onClick={() => navigate("/prompt-generator")}>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Prompt gen
                </Button>
                <Button variant="accent" onClick={() => navigate("/artifacts/new?type=PRD")}>
                  <Plus className="mr-2 h-4 w-4" /> New PRD
                </Button>
              </div>
            )}
          </header>


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
              <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border/60 md:grid-cols-4">
                <PulseMetric
                  label="Coverage"
                  value={`${stats.coveragePercent}%`}
                  sub={`${stats.satisfiedACs}/${stats.totalACs} ACs satisfied`}
                  tone={stats.coveragePercent >= 80 ? "good" : stats.coveragePercent >= 50 ? "warn" : "bad"}
                  onClick={() => navigate("/coverage")}
                />
                <PulseMetric
                  label="Open drift"
                  value={stats.openDrift.length.toString()}
                  sub={stats.openDrift.length === 0 ? "Nothing to review" : "Findings to triage"}
                  tone={stats.openDrift.length === 0 ? "good" : "warn"}
                  onClick={() => navigate("/drift")}
                />
                <PulseMetric
                  label="In flight"
                  value={stats.inProgressCount.toString()}
                  sub={`of ${stats.storyCount} stories`}
                  tone="neutral"
                  onClick={() => navigate("/artifacts")}
                />
                <PulseMetric
                  label="Acceptance criteria"
                  value={stats.acCount.toString()}
                  sub={`${stats.doneCount} completed`}
                  tone="neutral"
                  onClick={() => navigate("/artifacts?type=ACCEPTANCE_CRITERION")}
                />
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
                          className="w-full flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 hover:bg-muted/40 transition-colors text-left group"
                        >
                          <ArtifactTypeChip type={artifact.type} />
                          <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground w-16 shrink-0">{artifact.short_id}</span>
                          <span className="flex-1 text-[13px] text-foreground truncate">{artifact.title}</span>
                          <StatusDot status={artifact.status} />
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
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
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "bad" | "neutral";
  onClick?: () => void;
}) {
  const dotClass = {
    good: "bg-coverage-full",
    warn: "bg-coverage-partial",
    bad: "bg-drift",
    neutral: "bg-muted-foreground/40",
  }[tone];

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-1 bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotClass, tone === "bad" && "animate-pulse")} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </button>
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
