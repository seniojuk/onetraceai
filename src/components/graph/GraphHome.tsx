import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Search,
  TrendingDown,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useProjectArtifactEdges } from "@/hooks/useArtifactEdges";
import { useCoverageSnapshots } from "@/hooks/useCoverage";
import { useDriftFindings } from "@/hooks/useDriftFindings";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  GRAPH_QUESTIONS,
  TONE_CLASSES,
  type GraphQuestion,
} from "@/lib/graphQuestions";

/**
 * Graph Home — the new default landing for /graph.
 *
 * Insights-first. Lands on a small health pulse and a list of saved
 * questions instead of a full-project hairball. The user picks a
 * question (or an artifact via the picker) and enters a focused view.
 */
export function GraphHome() {
  const navigate = useNavigate();
  const { currentProjectId } = useUIStore();

  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: edges } = useProjectArtifactEdges(currentProjectId || undefined);
  const { data: coverageSnapshots } = useCoverageSnapshots(
    currentProjectId || undefined,
  );
  const { data: driftFindings } = useDriftFindings(currentProjectId || undefined);

  // ── Pulse stats ────────────────────────────────────────────────────────────
  const totalArtifacts = artifacts?.length ?? 0;

  const orphanCount = useMemo(() => {
    if (!artifacts || !edges) return 0;
    const connected = new Set<string>();
    edges.forEach((e) => {
      connected.add(e.from_artifact_id);
      connected.add(e.to_artifact_id);
    });
    return artifacts.filter((a) => !connected.has(a.id)).length;
  }, [artifacts, edges]);

  const avgCoverage = useMemo(() => {
    if (!coverageSnapshots || coverageSnapshots.length === 0) return null;
    const sum = coverageSnapshots.reduce(
      (acc, s) => acc + (s.coverage_ratio ?? 0),
      0,
    );
    return sum / coverageSnapshots.length;
  }, [coverageSnapshots]);

  const openDriftCount = useMemo(
    () => driftFindings?.filter((d) => d.status === "OPEN").length ?? 0,
    [driftFindings],
  );

  // ── Artifact picker ───────────────────────────────────────────────────────
  const [picker, setPicker] = useState("");
  const pickerResults = useMemo(() => {
    if (!picker.trim() || !artifacts) return [];
    const q = picker.toLowerCase();
    return artifacts
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.short_id.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [picker, artifacts]);

  const openQuestion = (q: GraphQuestion) => {
    navigate(`/graph?q=${q.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8 space-y-10">
      {/* Eyebrow + title */}
      <header className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-medium">
          Graph
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          What are you trying to find?
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-xl">
          The graph is a means, not the message. Pick a question — or an
          artifact — and we'll scope the canvas to just what matters.
        </p>
      </header>

      {/* Pulse strip */}
      <section
        aria-label="Project health"
        className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-md overflow-hidden bg-card"
      >
        <PulseCell
          label="Artifacts"
          value={formatInt(totalArtifacts)}
          hint="In this project"
        />
        <PulseCell
          label="Orphans"
          value={formatInt(orphanCount)}
          tone={orphanCount > 0 ? "warning" : "muted"}
          hint="No incoming or outgoing links"
          onClick={() => navigate("/graph?q=orphans")}
        />
        <PulseCell
          label="Coverage"
          value={avgCoverage === null ? "—" : `${Math.round(avgCoverage * 100)}%`}
          tone={
            avgCoverage === null
              ? "muted"
              : avgCoverage < 0.5
                ? "destructive"
                : avgCoverage < 0.8
                  ? "warning"
                  : "accent"
          }
          hint="Avg across snapshots"
          trend={avgCoverage !== null && avgCoverage < 0.5 ? "down" : "up"}
          onClick={() => navigate("/graph?q=coverage-gaps")}
        />
        <PulseCell
          label="Open drift"
          value={formatInt(openDriftCount)}
          tone={openDriftCount > 0 ? "destructive" : "muted"}
          hint="Spec ↔ code mismatches"
          onClick={() => navigate("/graph?q=drift")}
        />
      </section>

      {/* Artifact picker */}
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">
            Jump to an artifact
          </h2>
          <span className="text-[11px] text-muted-foreground/60">
            then pick "Trace" or "Blast radius"
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            placeholder="Search artifacts by title or ID…"
            className="h-10 pl-9 pr-3 text-[13px] bg-background border-border"
          />
          {pickerResults.length > 0 && (
            <div className="absolute inset-x-0 top-full mt-1.5 z-20 border border-border rounded-md bg-popover shadow-md overflow-hidden">
              {pickerResults.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/60 border-b border-border/60 last:border-0"
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0">
                    {a.short_id}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-foreground">
                    {a.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {a.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => navigate(`/graph?q=trace&artifact=${a.id}`)}
                    >
                      Trace
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() =>
                        navigate(`/graph?q=blast-radius&artifact=${a.id}`)
                      }
                    >
                      Blast radius
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Saved questions */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">
            Saved questions
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3" />
            More coming as you tag work
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {GRAPH_QUESTIONS.map((q) => {
            const tone = TONE_CLASSES[q.tone];
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                onClick={() => openQuestion(q)}
                className={cn(
                  "group relative text-left border border-border rounded-md bg-card",
                  "p-4 transition-colors hover:bg-muted/40",
                  tone.ring,
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-sm border border-border flex items-center justify-center shrink-0 bg-background",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", tone.icon)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-medium text-foreground truncate">
                        {q.label}
                      </h3>
                      {q.requiresArtifact && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 border border-border rounded px-1 py-px">
                          pick artifact
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground line-clamp-2">
                      {q.blurb}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Internals ────────────────────────────────────────────────────────────────

function formatInt(n: number) {
  return n.toLocaleString();
}

function PulseCell({
  label,
  value,
  hint,
  tone = "muted",
  trend,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "warning" | "destructive" | "accent";
  trend?: "up" | "down";
  onClick?: () => void;
}) {
  const toneClass = {
    muted: "text-foreground",
    warning: "text-warning",
    destructive: "text-destructive",
    accent: "text-accent",
  }[tone];

  const interactive = !!onClick;
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "text-left px-5 py-4 border-r last:border-r-0 border-border",
        "flex flex-col gap-1",
        interactive && "hover:bg-muted/40 transition-colors cursor-pointer",
        !interactive && "cursor-default",
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn("text-[22px] font-semibold tracking-tight", toneClass)}>
          {value}
        </span>
        {trend && tone !== "muted" && (
          <TrendIcon className={cn("h-3 w-3", toneClass)} />
        )}
      </span>
      {hint && (
        <span className="text-[11px] text-muted-foreground/70">{hint}</span>
      )}
    </button>
  );
}
