import { useMemo } from "react";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useProjectArtifactEdges } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { GraphFocusedShell } from "../GraphFocusedShell";
import { QUESTION_BY_ID } from "@/lib/graphQuestions";
import { ArtifactListRow, EmptyQuestion } from "./_shared";

/** Orphan stories — artifacts with zero edges (either direction). */
export function OrphansView() {
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: edges } = useProjectArtifactEdges(currentProjectId || undefined);

  const orphans = useMemo(() => {
    if (!artifacts || !edges) return [];
    const connected = new Set<string>();
    edges.forEach((e) => {
      connected.add(e.from_artifact_id);
      connected.add(e.to_artifact_id);
    });
    return artifacts
      .filter((a) => !connected.has(a.id))
      .sort((a, b) => a.type.localeCompare(b.type) || a.short_id.localeCompare(b.short_id));
  }, [artifacts, edges]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof orphans>();
    orphans.forEach((o) => {
      const arr = map.get(o.type) ?? [];
      arr.push(o);
      map.set(o.type, arr);
    });
    return Array.from(map.entries());
  }, [orphans]);

  return (
    <GraphFocusedShell
      question={QUESTION_BY_ID.orphans}
      count={`${orphans.length} found`}
      subtitle="Click any row to open the artifact and link it."
    >
      {orphans.length === 0 ? (
        <EmptyQuestion
          title="No orphans"
          body="Every artifact in this project is connected to at least one other."
          hint="As you add work, this view will surface anything stranded."
        />
      ) : (
        <div>
          {grouped.map(([type, items]) => (
            <section key={type}>
              <div className="px-6 py-2 bg-muted/30 border-b border-border/60 sticky top-0 z-10">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">
                  {type} · {items.length}
                </span>
              </div>
              {items.map((a) => (
                <ArtifactListRow
                  key={a.id}
                  artifact={a}
                  badge="orphan"
                  badgeTone="warning"
                  trailing={a.status}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </GraphFocusedShell>
  );
}
