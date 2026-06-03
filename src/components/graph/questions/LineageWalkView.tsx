import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useArtifacts, type Artifact } from "@/hooks/useArtifacts";
import { useProjectArtifactEdges, type ArtifactEdge } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { GraphFocusedShell } from "../GraphFocusedShell";
import { QUESTION_BY_ID, type GraphQuestionId } from "@/lib/graphQuestions";
import { ArtifactListRow, EmptyQuestion } from "./_shared";

interface LineageWalkViewProps {
  questionId: Extract<GraphQuestionId, "trace" | "blast-radius">;
}

/**
 * "Trace lineage" walks UPSTREAM from the picked artifact (its parents,
 * the things it derives from). "Blast radius" walks DOWNSTREAM (the
 * things it affects). Same shell, opposite traversal direction.
 *
 * Implementation note: this v1 is intentionally a list (BFS over edges)
 * rather than a canvas — it answers the question faster and reads on
 * mobile. We'll add an optional canvas inset in a follow-up.
 */
export function LineageWalkView({ questionId }: LineageWalkViewProps) {
  const [searchParams] = useSearchParams();
  const artifactId = searchParams.get("artifact");

  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: edges } = useProjectArtifactEdges(currentProjectId || undefined);

  const question = QUESTION_BY_ID[questionId];
  const direction = questionId === "trace" ? "upstream" : "downstream";

  const root = useMemo(
    () => artifacts?.find((a) => a.id === artifactId) ?? null,
    [artifacts, artifactId],
  );

  const walked = useMemo(() => {
    if (!root || !artifacts || !edges) return [];
    return bfsByDirection(root.id, edges, direction).map((step) => ({
      ...step,
      artifact: artifacts.find((a) => a.id === step.id),
    }));
  }, [root, artifacts, edges, direction]);

  if (!artifactId) {
    return (
      <GraphFocusedShell
        question={question}
        subtitle="Pick an artifact from the home screen first."
      >
        <EmptyQuestion
          title="No artifact selected"
          body={`Open the Graph home and use the picker to start ${
            direction === "upstream" ? "a trace" : "a blast-radius check"
          }.`}
        />
      </GraphFocusedShell>
    );
  }

  if (!root) {
    return (
      <GraphFocusedShell question={question}>
        <EmptyQuestion
          title="Artifact not found"
          body="It may have been deleted or moved to another project."
        />
      </GraphFocusedShell>
    );
  }

  const grouped = groupByDepth(walked);

  return (
    <GraphFocusedShell
      question={question}
      count={`${walked.length} ${direction === "upstream" ? "ancestors" : "descendants"}`}
      subtitle={
        <span>
          Walking {direction} from{" "}
          <span className="font-mono text-[10px]">{root.short_id}</span> ·{" "}
          {root.title}
        </span>
      }
      actions={
        <Link
          to="/graph"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Change artifact
        </Link>
      }
    >
      {walked.length === 0 ? (
        <EmptyQuestion
          title={direction === "upstream" ? "No ancestors" : "No descendants"}
          body={
            direction === "upstream"
              ? "Nothing links into this artifact yet."
              : "Nothing depends on this artifact yet."
          }
          hint="Link related artifacts from their detail page."
        />
      ) : (
        <div>
          {grouped.map(([depth, items]) => (
            <section key={depth}>
              <div className="px-6 py-2 bg-muted/30 border-b border-border/60 sticky top-0 z-10">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">
                  {direction === "upstream" ? "Up" : "Down"} · hop{" "}
                  {depth} · {items.length}
                </span>
              </div>
              {items.map((step) =>
                step.artifact ? (
                  <ArtifactListRow
                    key={`${depth}-${step.id}`}
                    artifact={step.artifact}
                    trailing={step.viaEdgeType}
                    badge={step.artifact.status}
                    badgeTone="muted"
                  />
                ) : null,
              )}
            </section>
          ))}
        </div>
      )}
    </GraphFocusedShell>
  );
}

// ── Traversal helpers ────────────────────────────────────────────────────────

interface WalkStep {
  id: string;
  depth: number;
  viaEdgeType: string;
}

function bfsByDirection(
  rootId: string,
  edges: ArtifactEdge[],
  direction: "upstream" | "downstream",
): WalkStep[] {
  const adjacency = new Map<string, { neighbor: string; edgeType: string }[]>();
  edges.forEach((e) => {
    // upstream = follow incoming edges (to_artifact_id === current)
    // downstream = follow outgoing edges (from_artifact_id === current)
    const from = direction === "upstream" ? e.to_artifact_id : e.from_artifact_id;
    const to = direction === "upstream" ? e.from_artifact_id : e.to_artifact_id;
    const arr = adjacency.get(from) ?? [];
    arr.push({ neighbor: to, edgeType: e.edge_type });
    adjacency.set(from, arr);
  });

  const visited = new Set<string>([rootId]);
  const out: WalkStep[] = [];
  let frontier: { id: string; depth: number; edgeType: string }[] = (
    adjacency.get(rootId) ?? []
  ).map((n) => ({ id: n.neighbor, depth: 1, edgeType: n.edgeType }));

  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const step of frontier) {
      if (visited.has(step.id)) continue;
      visited.add(step.id);
      out.push({ id: step.id, depth: step.depth, viaEdgeType: step.edgeType });
      for (const n of adjacency.get(step.id) ?? []) {
        if (!visited.has(n.neighbor)) {
          next.push({
            id: n.neighbor,
            depth: step.depth + 1,
            edgeType: n.edgeType,
          });
        }
      }
    }
    frontier = next;
  }

  return out;
}

function groupByDepth<T extends { depth: number }>(items: T[]): [number, T[]][] {
  const map = new Map<number, T[]>();
  items.forEach((s) => {
    const arr = map.get(s.depth) ?? [];
    arr.push(s);
    map.set(s.depth, arr);
  });
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}

// Keep Artifact type imported for downstream typing consumers
export type { Artifact };
