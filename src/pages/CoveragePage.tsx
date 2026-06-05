import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts } from "@/hooks/useArtifacts";
import {
  useCoverageSnapshots,
  useCoverageHistory,
  useComputeCoverage,
  type CoverageSnapshot,
} from "@/hooks/useCoverage";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import CoverageGapReport from "@/components/coverage/CoverageGapReport";
import CoverageTrendChart from "@/components/coverage/CoverageTrendChart";

const CoveragePage = () => {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const { data: artifacts, isLoading: artifactsLoading } = useArtifacts(currentProjectId || undefined);
  const { data: snapshots, isLoading: snapshotsLoading } = useCoverageSnapshots(currentProjectId || undefined);
  const { data: coverageHistory } = useCoverageHistory(currentProjectId || undefined);
  const computeCoverage = useComputeCoverage();

  const isLoading = artifactsLoading || snapshotsLoading;

  const snapshotMap = new Map<string, CoverageSnapshot>();
  for (const s of snapshots || []) snapshotMap.set(s.artifact_id, s);

  const stories = artifacts?.filter((a) => a.type === "STORY") || [];
  const acs = artifacts?.filter((a) => a.type === "ACCEPTANCE_CRITERION") || [];
  const tests = artifacts?.filter((a) => a.type === "TEST_CASE") || [];

  const hasSnapshots = (snapshots || []).length > 0;

  let totalACs = 0;
  let satisfiedACs = 0;
  let testedACs = 0;

  if (hasSnapshots) {
    for (const s of snapshots!) {
      totalACs += s.total_acs;
      satisfiedACs += s.satisfied_acs;
      testedACs += s.tested_acs;
    }
  } else {
    totalACs = acs.length;
    satisfiedACs = acs.filter((ac) => ac.status === "DONE").length;
    testedACs = tests.length;
  }

  const coveragePercent = totalACs > 0 ? Math.round((satisfiedACs / totalACs) * 100) : 0;
  const testCoveragePercent = totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0;
  const untestedCount = Math.max(totalACs - testedACs, 0);

  // Delta vs previous snapshot run
  const coverageDelta = useMemo(() => {
    if (!coverageHistory || coverageHistory.length < 2) return null;
    const grouped = new Map<string, { sat: number; total: number; tested: number }>();
    for (const s of coverageHistory) {
      const key = s.computed_at?.slice(0, 16) || "";
      if (!key) continue;
      const g = grouped.get(key) || { sat: 0, total: 0, tested: 0 };
      g.sat += s.satisfied_acs || 0;
      g.total += s.total_acs || 0;
      g.tested += s.tested_acs || 0;
      grouped.set(key, g);
    }
    const points = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (points.length < 2) return null;
    const prev = points[points.length - 2][1];
    const curr = points[points.length - 1][1];
    const prevPct = prev.total > 0 ? (prev.sat / prev.total) * 100 : 0;
    const currPct = curr.total > 0 ? (curr.sat / curr.total) * 100 : 0;
    const prevTestPct = prev.total > 0 ? (prev.tested / prev.total) * 100 : 0;
    const currTestPct = curr.total > 0 ? (curr.tested / curr.total) * 100 : 0;
    return {
      coverage: Math.round((currPct - prevPct) * 10) / 10,
      test: Math.round((currTestPct - prevTestPct) * 10) / 10,
    };
  }, [coverageHistory]);

  // Sparkline data
  const sparkPoints = useMemo(() => {
    if (!coverageHistory || coverageHistory.length < 2) return [];
    const grouped = new Map<string, { sat: number; total: number }>();
    for (const s of coverageHistory) {
      const key = s.computed_at?.slice(0, 16) || "";
      if (!key) continue;
      const g = grouped.get(key) || { sat: 0, total: 0 };
      g.sat += s.satisfied_acs || 0;
      g.total += s.total_acs || 0;
      grouped.set(key, g);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => (v.total > 0 ? (v.sat / v.total) * 100 : 0));
  }, [coverageHistory]);

  const allUntestedAcIds = new Set<string>();
  const allUnsatisfiedAcIds = new Set<string>();
  for (const s of snapshots || []) {
    for (const id of s.missing?.untested_ac_ids || []) allUntestedAcIds.add(id);
    for (const id of s.missing?.unsatisfied_ac_ids || []) allUnsatisfiedAcIds.add(id);
  }

  const coverageByStory = stories
    .map((story) => {
      const snapshot = snapshotMap.get(story.id);
      if (snapshot) {
        return {
          id: story.id,
          shortId: story.short_id,
          title: story.title,
          totalACs: snapshot.total_acs,
          satisfiedACs: snapshot.satisfied_acs,
          testedACs: snapshot.tested_acs,
          coverage: Math.round((snapshot.coverage_ratio ?? 0) * 100),
          status: story.status,
        };
      }
      return {
        id: story.id,
        shortId: story.short_id,
        title: story.title,
        totalACs: 0,
        satisfiedACs: 0,
        testedACs: 0,
        coverage: 0,
        status: story.status,
      };
    })
    .sort((a, b) => a.coverage - b.coverage);

  // Priority gaps for sidebar (top N most at-risk stories)
  const priorityGaps = coverageByStory
    .filter((s) => s.totalACs > 0 && s.coverage < 100)
    .slice(0, 5);

  const handleRefresh = async () => {
    if (!currentProjectId || !currentWorkspaceId) {
      toast({ title: "No project selected", description: "Please select a project first.", variant: "destructive" });
      return;
    }
    try {
      const result = await computeCoverage.mutateAsync({
        projectId: currentProjectId,
        workspaceId: currentWorkspaceId,
      });
      toast({
        title: "Coverage recomputed",
        description: `${result.snapshots_created} snapshots saved. ${result.drift_findings_created} drift findings created.`,
      });
    } catch (err: any) {
      toast({ title: "Recomputation failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  const healthLabel =
    coveragePercent >= 85 ? "Healthy" : coveragePercent >= 60 ? "At risk" : "Needs attention";
  const healthTone =
    coveragePercent >= 85
      ? "text-success bg-success/10 border-success/20"
      : coveragePercent >= 60
        ? "text-warning bg-warning/10 border-warning/20"
        : "text-destructive bg-destructive/10 border-destructive/20";

  return (
    <AuthGuard>
      <AppLayout>
        <div className="px-8 py-8 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 pb-6 mb-8 border-b border-border">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Coverage</h1>
                {hasSnapshots && (
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", healthTone)}>
                    {healthLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time analysis of acceptance criteria satisfaction and test verification.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={computeCoverage.isPending}
              className="rounded-[0.625rem]"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", computeCoverage.isPending && "animate-spin")} />
              {computeCoverage.isPending ? "Computing…" : "Recompute"}
            </Button>
          </div>

          {!hasSnapshots && stories.length > 0 && (
            <div className="mb-6 p-4 rounded-[0.625rem] border border-warning/30 bg-warning/5 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">No coverage data yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click <span className="font-medium">Recompute</span> to analyze your artifacts and build the first snapshot.
                </p>
              </div>
            </div>
          )}

          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Overall Coverage"
              value={`${coveragePercent}%`}
              delta={coverageDelta?.coverage ?? null}
              icon={<BarChart3 className="w-4 h-4 text-success" />}
              iconBg="bg-success/10"
              progress={coveragePercent}
              progressColor="bg-success"
            />
            <KpiCard
              label="Test Coverage"
              value={`${testCoveragePercent}%`}
              delta={coverageDelta?.test ?? null}
              icon={<Target className="w-4 h-4 text-accent" />}
              iconBg="bg-accent/10"
              progress={testCoveragePercent}
              progressColor="bg-accent"
            />
            <KpiCard
              label="Total ACs"
              value={totalACs.toString()}
              sub={`${satisfiedACs} satisfied · ${testedACs} tested`}
              icon={<CheckCircle2 className="w-4 h-4 text-foreground/70" />}
              iconBg="bg-foreground/5"
              segmented={{ total: totalACs, satisfied: satisfiedACs, tested: testedACs }}
            />
            <KpiCard
              label="Untested"
              value={untestedCount.toString()}
              valueClassName={untestedCount > 0 ? "text-destructive" : ""}
              sub={untestedCount > 0 ? "ACs need verification" : "All ACs verified"}
              icon={<AlertCircle className="w-4 h-4 text-destructive" />}
              iconBg="bg-destructive/10"
              progress={totalACs > 0 ? (untestedCount / totalACs) * 100 : 0}
              progressColor="bg-destructive"
            />
          </div>

          {/* Main grid: stories (2/3) + sidebar (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stories table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Coverage by Story</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sorted by risk — lowest coverage first
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {coverageByStory.length} {coverageByStory.length === 1 ? "story" : "stories"}
                  </span>
                </div>

                {coverageByStory.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No stories yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-[0.625rem]"
                      onClick={() => navigate("/artifacts/new?type=STORY")}
                    >
                      Create Story
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="w-24 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          ID
                        </TableHead>
                        <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Story
                        </TableHead>
                        <TableHead className="w-28 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          ACs
                        </TableHead>
                        <TableHead className="w-44 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Coverage
                        </TableHead>
                        <TableHead className="w-28 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coverageByStory.map((story) => (
                        <TableRow
                          key={story.id}
                          className="cursor-pointer hover:bg-muted/40 group border-border"
                          onClick={() => navigate(`/artifacts/${story.id}`)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {story.shortId}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{story.title}</TableCell>
                          <TableCell>
                            <div className="text-sm tabular-nums">
                              <span className="text-foreground">
                                {story.satisfiedACs}/{story.totalACs}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({story.testedACs} tested)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CoverageBar value={story.coverage} />
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusBadge status={story.status} />
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Full gap report under stories */}
              {hasSnapshots && (allUntestedAcIds.size > 0 || allUnsatisfiedAcIds.size > 0) && (
                <CoverageGapReport
                  untestedAcIds={Array.from(allUntestedAcIds)}
                  unsatisfiedAcIds={Array.from(allUnsatisfiedAcIds)}
                  artifacts={artifacts || []}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Sparkline trend */}
              <div className="bg-card rounded-[0.625rem] border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Coverage Trend
                  </h3>
                  {coverageDelta && coverageDelta.coverage !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        coverageDelta.coverage > 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {coverageDelta.coverage > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {coverageDelta.coverage > 0 ? "+" : ""}
                      {coverageDelta.coverage}%
                    </span>
                  )}
                </div>
                <Sparkline points={sparkPoints} />
                <div className="flex justify-between mt-2 text-[10px] font-medium text-muted-foreground">
                  <span>Earlier</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Priority gaps */}
              <div className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Priority Gaps
                  </h3>
                  {priorityGaps.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                      {priorityGaps.length}
                    </span>
                  )}
                </div>
                {priorityGaps.length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-success/60 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {hasSnapshots ? "No gaps detected" : "Recompute to see gaps"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {priorityGaps.map((gap) => {
                      const tone =
                        gap.coverage < 40
                          ? "bg-destructive"
                          : gap.coverage < 70
                            ? "bg-warning"
                            : "bg-success";
                      return (
                        <button
                          key={gap.id}
                          onClick={() => navigate(`/artifacts/${gap.id}`)}
                          className="w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors group flex items-start gap-3"
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", tone)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {gap.shortId}
                              </span>
                              <span className="text-[10px] font-semibold tabular-nums text-foreground">
                                {gap.coverage}%
                              </span>
                            </div>
                            <p className="text-xs font-medium text-foreground mt-0.5 truncate">
                              {gap.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {gap.totalACs - gap.satisfiedACs} unsatisfied ·{" "}
                              {gap.totalACs - gap.testedACs} untested
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Historical trend chart */}
              {coverageHistory && coverageHistory.length >= 2 && (
                <CoverageTrendChart history={coverageHistory} />
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

/* ---------- subcomponents ---------- */

interface KpiCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  sub?: string;
  delta?: number | null;
  icon: React.ReactNode;
  iconBg: string;
  progress?: number;
  progressColor?: string;
  segmented?: { total: number; satisfied: number; tested: number };
}

const KpiCard = ({
  label,
  value,
  valueClassName,
  sub,
  delta,
  icon,
  iconBg,
  progress,
  progressColor,
  segmented,
}: KpiCardProps) => {
  return (
    <div className="bg-card p-5 rounded-[0.625rem] border border-border">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className={cn("p-1.5 rounded-md", iconBg)}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("text-2xl font-semibold tabular-nums tracking-tight", valueClassName)}>
          {value}
        </span>
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span
            className={cn(
              "text-xs font-medium",
              delta > 0 ? "text-success" : "text-destructive",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-500", progressColor)}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      {segmented && segmented.total > 0 && (
        <div className="mt-4 flex gap-0.5 h-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const ratio = (i + 1) / 12;
            const satRatio = segmented.satisfied / segmented.total;
            const testRatio = segmented.tested / segmented.total;
            const color =
              ratio <= testRatio
                ? "bg-accent"
                : ratio <= satRatio
                  ? "bg-success/60"
                  : "bg-muted";
            return <div key={i} className={cn("flex-1 rounded-full", color)} />;
          })}
        </div>
      )}
    </div>
  );
};

const CoverageBar = ({ value }: { value: number }) => {
  const tone =
    value === 100
      ? "bg-success"
      : value >= 70
        ? "bg-warning"
        : value > 0
          ? "bg-destructive"
          : "bg-muted-foreground/20";
  const textTone =
    value === 100
      ? "text-success"
      : value >= 70
        ? "text-warning"
        : value > 0
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums w-9 text-right", textTone)}>
        {value}%
      </span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string | null }) => {
  const map: Record<string, string> = {
    DONE: "bg-success/10 text-success border-success/20",
    IN_PROGRESS: "bg-warning/10 text-warning border-warning/20",
    DRAFT: "bg-muted text-muted-foreground border-border",
    BLOCKED: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const cls = map[status || "DRAFT"] || map.DRAFT;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5",
        cls,
      )}
    >
      {(status || "DRAFT").replace("_", " ")}
    </Badge>
  );
};

const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) {
    return (
      <div className="h-20 flex items-center justify-center text-[11px] text-muted-foreground">
        Not enough history yet
      </div>
    );
  }
  const w = 280;
  const h = 80;
  const max = 100;
  const min = 0;
  const stepX = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = h - ((p - min) / (max - min)) * h;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r="2.5"
          fill="hsl(var(--accent))"
        />
      )}
    </svg>
  );
};

export default CoveragePage;
