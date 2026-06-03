import { useMemo } from "react";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { GraphFocusedShell } from "../GraphFocusedShell";
import { QUESTION_BY_ID } from "@/lib/graphQuestions";
import { ArtifactListRow, EmptyQuestion } from "./_shared";
import { formatDistanceToNow } from "date-fns";

const WINDOW_DAYS = 14;

/** Recently changed — artifacts updated in the last N days. */
export function RecentlyChangedView() {
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);

  const rows = useMemo(() => {
    if (!artifacts) return [];
    const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return [...artifacts]
      .filter((a) => new Date(a.updated_at).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }, [artifacts]);

  return (
    <GraphFocusedShell
      question={QUESTION_BY_ID.recent}
      count={`${rows.length} in ${WINDOW_DAYS}d`}
      subtitle="Most recently updated first."
    >
      {rows.length === 0 ? (
        <EmptyQuestion
          title="Nothing new"
          body={`No artifact has been updated in the last ${WINDOW_DAYS} days.`}
        />
      ) : (
        <div>
          {rows.map((a) => (
            <ArtifactListRow
              key={a.id}
              artifact={a}
              trailing={formatDistanceToNow(new Date(a.updated_at), {
                addSuffix: true,
              })}
              badge={a.status}
              badgeTone="muted"
            />
          ))}
        </div>
      )}
    </GraphFocusedShell>
  );
}
