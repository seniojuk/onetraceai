import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useUIStore } from "@/store/uiStore";
import {
  useDriftFindings,
  useResolveDriftFinding,
  useIgnoreDriftFinding,
  type DriftFinding,
} from "@/hooks/useDriftFindings";
import { useComputeCoverage } from "@/hooks/useCoverage";
import { useArtifacts } from "@/hooks/useArtifacts";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Severity = "HIGH" | "MEDIUM" | "LOW";

const severityLabel = (sev: number | null): Severity => {
  if (sev === 3) return "HIGH";
  if (sev === 2) return "MEDIUM";
  return "LOW";
};

const typeLabels: Record<string, string> = {
  COVERAGE_GAP: "Coverage gap",
  UNTRACED_COMMIT: "Untraced commit",
  MISSING_TESTS: "Missing tests",
  STATUS_MISMATCH: "Status mismatch",
  ORPHAN_ARTIFACT: "Orphan artifact",
  STALE_REQUIREMENT: "Stale requirement",
};

const relativeTime = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const DriftPage = () => {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();

  const { data: findings = [], isLoading } = useDriftFindings(
    currentProjectId || undefined
  );
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const resolveFinding = useResolveDriftFinding();
  const ignoreFinding = useIgnoreDriftFinding();
  const computeCoverage = useComputeCoverage();

  const [severityFilter, setSeverityFilter] = useState<Severity[]>([]);
  const [tab, setTab] = useState<"OPEN" | "RESOLVED" | "IGNORED">("OPEN");

  const artifactMap = useMemo(() => {
    const m = new Map<string, { short_id: string; title: string }>();
    for (const a of artifacts || []) {
      m.set(a.id, { short_id: a.short_id, title: a.title });
    }
    return m;
  }, [artifacts]);

  const openFindings = findings.filter((f) => f.status === "OPEN");
  const resolvedFindings = findings.filter((f) => f.status === "RESOLVED");
  const ignoredFindings = findings.filter((f) => f.status === "IGNORED");

  const severityCounts = useMemo(() => {
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<Severity, number>;
    openFindings.forEach((f) => c[severityLabel(f.severity)]++);
    return c;
  }, [openFindings]);

  const lastDetected = useMemo(() => {
    const dates = findings
      .map((f) => f.detected_at)
      .filter(Boolean) as string[];
    if (!dates.length) return null;
    return dates.sort().reverse()[0];
  }, [findings]);

  const visible = useMemo(() => {
    const base = findings.filter((f) => f.status === tab);
    const filtered =
      severityFilter.length === 0
        ? base
        : base.filter((f) =>
            severityFilter.includes(severityLabel(f.severity))
          );
    // Sort by severity desc, then detected_at desc
    return filtered.sort((a, b) => {
      const sa = a.severity ?? 0;
      const sb = b.severity ?? 0;
      if (sa !== sb) return sb - sa;
      return (
        new Date(b.detected_at || 0).getTime() -
        new Date(a.detected_at || 0).getTime()
      );
    });
  }, [findings, tab, severityFilter]);

  const groupedBySeverity = useMemo(() => {
    if (tab !== "OPEN") return null;
    const groups: Record<Severity, DriftFinding[]> = {
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };
    visible.forEach((f) => groups[severityLabel(f.severity)].push(f));
    return groups;
  }, [visible, tab]);

  const handleScan = async () => {
    if (!currentProjectId || !currentWorkspaceId) {
      toast({
        title: "No project selected",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await computeCoverage.mutateAsync({
        projectId: currentProjectId,
        workspaceId: currentWorkspaceId,
      });
      toast({
        title: "Scan complete",
        description: `${result.drift_findings_created} new findings detected.`,
      });
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleResolve = (id: string) => {
    resolveFinding.mutate(
      { findingId: id },
      {
        onSuccess: () => toast({ title: "Resolved" }),
        onError: (err) =>
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const handleIgnore = (id: string) => {
    ignoreFinding.mutate(
      { findingId: id },
      {
        onSuccess: () => toast({ title: "Ignored" }),
        onError: (err) =>
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const SeverityRail = ({ sev }: { sev: Severity }) => (
    <span
      aria-hidden
      className={cn(
        "absolute left-0 top-0 h-full w-[3px] rounded-l-xl",
        sev === "HIGH" && "bg-drift",
        sev === "MEDIUM" && "bg-amber-500/70",
        sev === "LOW" && "bg-accent/60"
      )}
    />
  );

  const FindingRow = ({ finding }: { finding: DriftFinding }) => {
    const sev = severityLabel(finding.severity);
    const primary = finding.primary_artifact_id
      ? artifactMap.get(finding.primary_artifact_id)
      : null;
    const coverage = finding.evidence?.coverage_ratio;
    const threshold = finding.evidence?.threshold ?? 0.7;

    return (
      <div
        className={cn(
          "group relative rounded-xl border border-border bg-card transition-all",
          "hover:border-foreground/20 hover:shadow-sm"
        )}
      >
        <SeverityRail sev={sev} />
        <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className={cn(
                  "font-mono uppercase tracking-wider",
                  sev === "HIGH" && "text-drift",
                  sev === "MEDIUM" && "text-amber-600 dark:text-amber-400",
                  sev === "LOW" && "text-muted-foreground"
                )}
              >
                {sev}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">
                {typeLabels[finding.type] || finding.type}
              </span>
              {primary && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <button
                    onClick={() =>
                      navigate(`/artifacts/${finding.primary_artifact_id}`)
                    }
                    className="font-mono text-foreground/70 hover:text-accent"
                  >
                    {primary.short_id}
                  </button>
                </>
              )}
            </div>

            <h4 className="font-display text-[15px] font-medium leading-snug text-foreground">
              {finding.title}
            </h4>
            {finding.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {finding.description}
              </p>
            )}

            {typeof coverage === "number" && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      coverage < threshold ? "bg-drift" : "bg-accent"
                    )}
                    style={{
                      width: `${Math.max(4, Math.round(coverage * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {Math.round(coverage * 100)}% / {Math.round(threshold * 100)}%
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {relativeTime(finding.detected_at)}
              </span>
              {finding.resolution_note && (
                <span className="italic">— {finding.resolution_note}</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {finding.status === "OPEN" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleIgnore(finding.id)}
                  disabled={ignoreFinding.isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Ignore
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => handleResolve(finding.id)}
                  disabled={resolveFinding.isPending}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Resolve
                </Button>
              </>
            )}
            {finding.status !== "OPEN" && finding.primary_artifact_id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate(`/artifacts/${finding.primary_artifact_id}`)
                }
              >
                View
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  const totalOpen = openFindings.length;
  const inSync = totalOpen === 0;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
          {/* Hero */}
          <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    inSync ? "bg-accent" : "bg-drift animate-pulse"
                  )}
                />
                {inSync ? "In sync" : "Drift detected"}
              </p>
              <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
                Drift
              </h1>
              <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
                {inSync
                  ? "Your graph is in sync. We'll surface anything that slips."
                  : `${totalOpen} thing${totalOpen === 1 ? "" : "s"} have slipped out of sync. Triage from the top.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                Last scan {relativeTime(lastDetected)}
              </span>
              <Button
                variant="accent"
                onClick={handleScan}
                disabled={computeCoverage.isPending}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    computeCoverage.isPending && "animate-spin"
                  )}
                />
                {computeCoverage.isPending ? "Scanning…" : "Scan now"}
              </Button>
            </div>
          </header>

          {/* Severity strip */}
          {totalOpen > 0 && (
            <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
              {(["HIGH", "MEDIUM", "LOW"] as Severity[]).map((s) => {
                const active = severityFilter.includes(s);
                const count = severityCounts[s];
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setSeverityFilter((prev) =>
                        prev.includes(s)
                          ? prev.filter((x) => x !== s)
                          : [...prev, s]
                      )
                    }
                    className={cn(
                      "group flex flex-col items-start gap-1 bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50",
                      active && "bg-muted/70"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          s === "HIGH" && "bg-drift",
                          s === "MEDIUM" && "bg-amber-500",
                          s === "LOW" && "bg-accent"
                        )}
                      />
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {s}
                      </span>
                    </div>
                    <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabs + filter */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <div className="flex">
              {(
                [
                  { k: "OPEN", label: "Open", n: openFindings.length },
                  { k: "RESOLVED", label: "Resolved", n: resolvedFindings.length },
                  { k: "IGNORED", label: "Ignored", n: ignoredFindings.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={cn(
                    "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    tab === t.k
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                    {t.n}
                  </span>
                </button>
              ))}
            </div>

            {severityFilter.length > 0 && (
              <button
                onClick={() => setSeverityFilter([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* List */}
          {visible.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
              {tab === "OPEN" ? (
                <>
                  <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Nothing's drifted.
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                    Every artifact lines up with its trace. We'll let you know
                    the moment something slips.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No {tab.toLowerCase()} findings.
                </p>
              )}
            </div>
          ) : tab === "OPEN" && groupedBySeverity ? (
            <div className="space-y-8">
              {(["HIGH", "MEDIUM", "LOW"] as Severity[]).map((s) => {
                const items = groupedBySeverity[s];
                if (!items.length) return null;
                return (
                  <section key={s}>
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {s === "HIGH"
                          ? "Fix first"
                          : s === "MEDIUM"
                            ? "Should fix"
                            : "Nice to fix"}
                      </h2>
                      <span className="text-xs text-muted-foreground/60">
                        · {items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((f) => (
                        <FindingRow key={f.id} finding={f} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((f) => (
                <FindingRow key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default DriftPage;
