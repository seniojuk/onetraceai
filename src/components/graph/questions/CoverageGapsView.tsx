import { useMemo } from "react";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useCoverageSnapshots } from "@/hooks/useCoverage";
import { useUIStore } from "@/store/uiStore";
import { GraphFocusedShell } from "../GraphFocusedShell";
import { QUESTION_BY_ID } from "@/lib/graphQuestions";
import { ArtifactListRow, EmptyQuestion } from "./_shared";

const THIN_THRESHOLD = 0.8;

/** Coverage gaps — artifacts with the thinnest coverage (asc). */
export function CoverageGapsView() {
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: snapshots } = useCoverageSnapshots(currentProjectId || undefined);

  const rows = useMemo(() => {
    if (!artifacts || !snapshots) return [];
    const byArtifact = new Map<string, number>();
    snapshots.forEach((s) => byArtifact.set(s.artifact_id, s.coverage_ratio ?? 0));
    return artifacts
      .map((a) => ({ artifact: a, ratio: byArtifact.get(a.id) ?? 0 }))
      .filter((r) => r.ratio < THIN_THRESHOLD)
      .sort((a, b) => a.ratio - b.ratio);
  }, [artifacts, snapshots]);

  return (
    <GraphFocusedShell
      question={QUESTION_BY_ID["coverage-gaps"]}
      count={`${rows.length} below ${Math.round(THIN_THRESHOLD * 100)}%`}
      subtitle="Sorted thinnest first. Open an artifact to see what's missing."
    >
      {rows.length === 0 ? (
        <EmptyQuestion
          title="Coverage looks healthy"
          body={`No artifact is below ${Math.round(THIN_THRESHOLD * 100)}% test coverage.`}
        />
      ) : (
        <div>
          {rows.map(({ artifact, ratio }) => {
            const pct = Math.round(ratio * 100);
            const tone =
              ratio < 0.3 ? "destructive" : ratio < 0.6 ? "warning" : "muted";
            return (
              <ArtifactListRow
                key={artifact.id}
                artifact={artifact}
                badge={`${pct}%`}
                badgeTone={tone}
                trailing={artifact.status}
              />
            );
          })}
        </div>
      )}
    </GraphFocusedShell>
  );
}
