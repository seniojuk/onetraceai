import { useMemo } from "react";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useDriftFindings } from "@/hooks/useDriftFindings";
import { useUIStore } from "@/store/uiStore";
import { GraphFocusedShell } from "../GraphFocusedShell";
import { QUESTION_BY_ID } from "@/lib/graphQuestions";
import { ArtifactListRow, EmptyQuestion } from "./_shared";
import { formatDistanceToNow } from "date-fns";

/** Drift hotspots — open findings sorted by severity, newest first. */
export function DriftView() {
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: findings } = useDriftFindings(currentProjectId || undefined);

  const open = useMemo(() => {
    if (!findings) return [];
    return [...findings]
      .filter((d) => d.status === "OPEN")
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  }, [findings]);

  const byId = useMemo(() => {
    const m = new Map<string, (typeof artifacts)[number]>();
    artifacts?.forEach((a) => m.set(a.id, a));
    return m;
  }, [artifacts]);

  return (
    <GraphFocusedShell
      question={QUESTION_BY_ID.drift}
      count={`${open.length} open`}
      subtitle="Highest severity first. Each row points at the primary affected artifact."
    >
      {open.length === 0 ? (
        <EmptyQuestion
          title="No open drift"
          body="Spec and code are in agreement across this project."
        />
      ) : (
        <div>
          {open.map((d) => {
            const primary = d.primary_artifact_id
              ? byId.get(d.primary_artifact_id)
              : undefined;
            const sev = d.severity ?? 1;
            const tone = sev >= 3 ? "destructive" : sev >= 2 ? "warning" : "muted";
            const sevLabel = sev >= 3 ? "high" : sev >= 2 ? "med" : "low";
            const ago = d.detected_at
              ? formatDistanceToNow(new Date(d.detected_at), { addSuffix: true })
              : "—";

            if (!primary) {
              // Render a synthetic row for findings without an artifact pointer
              return (
                <div
                  key={d.id}
                  className="grid items-center gap-3 px-6 py-2.5 border-b border-border/60"
                  style={{ gridTemplateColumns: "70px 70px 1fr auto auto 14px" }}
                >
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    —
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {d.type}
                  </span>
                  <div className="min-w-0 text-[13px] text-foreground truncate">
                    {d.title}
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-wide rounded border px-1.5 py-0.5 ${
                      tone === "destructive"
                        ? "border-destructive/20 text-destructive bg-destructive/10"
                        : tone === "warning"
                          ? "border-warning/20 text-warning bg-warning/10"
                          : "border-border text-muted-foreground bg-muted/40"
                    }`}
                  >
                    {sevLabel}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                    {ago}
                  </span>
                  <span />
                </div>
              );
            }

            return (
              <ArtifactListRow
                key={d.id}
                artifact={primary}
                badge={sevLabel}
                badgeTone={tone}
                trailing={ago}
                description={d.title}
              />
            );
          })}
        </div>
      )}
    </GraphFocusedShell>
  );
}
