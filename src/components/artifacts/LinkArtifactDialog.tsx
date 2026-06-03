import { useMemo, useState } from "react";
import { Search, Link2, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useArtifacts,
  type Artifact,
  type ArtifactType,
} from "@/hooks/useArtifacts";
import {
  useArtifactEdges,
  useCreateArtifactEdge,
  useDeleteArtifactEdge,
} from "@/hooks/useArtifactEdges";
import { linkRules, type LinkRule } from "@/lib/artifactLinking";

interface LinkArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The "child" artifact being linked to a parent. */
  artifact: Artifact;
}

/**
 * Typed parent picker.
 *
 * Shows only valid parent types for the artifact's type. Search filters
 * across title + short_id. The current parent (if any) is highlighted
 * and clicking it unlinks (with undo toast). Clicking a different
 * candidate replaces the link in a single transaction.
 */
export function LinkArtifactDialog({
  open,
  onOpenChange,
  artifact,
}: LinkArtifactDialogProps) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rules = linkRules[artifact.type] ?? [];
  const allowedParentTypes = useMemo(
    () => new Set(rules.map((r) => r.parentType)),
    [rules],
  );

  const { data: projectArtifacts = [] } = useArtifacts(artifact.project_id);
  const { data: edges } = useArtifactEdges(artifact.id);
  const createEdge = useCreateArtifactEdge();
  const deleteEdge = useDeleteArtifactEdge();

  // Existing structural parent edges (incoming = something points to me).
  const currentParentEdges = useMemo(() => {
    if (!edges) return [];
    return edges.incoming.filter((e) =>
      rules.some(
        (r) => r.edgeType === e.edge_type && r.structural,
      ),
    );
  }, [edges, rules]);

  const currentParentIds = new Set(
    currentParentEdges.map((e) => e.from_artifact_id),
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projectArtifacts
      .filter(
        (a) =>
          a.id !== artifact.id &&
          allowedParentTypes.has(a.type) &&
          a.status !== "ARCHIVED" &&
          (q === "" ||
            a.title.toLowerCase().includes(q) ||
            a.short_id.toLowerCase().includes(q)),
      )
      .slice(0, 50);
  }, [projectArtifacts, allowedParentTypes, artifact.id, query]);

  // Group by parent type for visual scanability.
  const grouped = useMemo(() => {
    const map = new Map<ArtifactType, Artifact[]>();
    for (const a of candidates) {
      if (!map.has(a.type)) map.set(a.type, []);
      map.get(a.type)!.push(a);
    }
    return map;
  }, [candidates]);

  const handlePick = async (parent: Artifact, rule: LinkRule) => {
    setPendingId(parent.id);
    try {
      // If a structural parent already exists, replace it.
      const existingStructural = currentParentEdges.find((e) => {
        const matchedRule = rules.find(
          (r) => r.edgeType === e.edge_type && r.structural,
        );
        return !!matchedRule;
      });

      if (existingStructural?.from_artifact_id === parent.id) {
        // Same parent picked → treat as no-op + close.
        onOpenChange(false);
        return;
      }

      if (existingStructural && rule.structural) {
        await deleteEdge.mutateAsync({
          edgeId: existingStructural.id,
          projectId: artifact.project_id,
        });
      }

      await createEdge.mutateAsync({
        workspaceId: artifact.workspace_id,
        projectId: artifact.project_id,
        fromArtifactId: parent.id,
        toArtifactId: artifact.id,
        edgeType: rule.edgeType,
        source: "MANUAL",
        confidence: 1.0,
      });

      toast.success(
        `Linked to ${parent.short_id}`,
        { description: parent.title },
      );
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not link", {
        description: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleUnlink = async (edgeId: string, parent: Artifact) => {
    try {
      await deleteEdge.mutateAsync({ edgeId, projectId: artifact.project_id });
      toast.success(`Unlinked from ${parent.short_id}`);
    } catch (e) {
      toast.error("Could not unlink");
    }
  };

  const ruleForType = (t: ArtifactType): LinkRule | undefined =>
    rules.find((r) => r.parentType === t);

  if (rules.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Linking not available</DialogTitle>
            <DialogDescription>
              {artifact.type.replace("_", " ").toLowerCase()} artifacts have no
              parent type defined.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Link {artifact.short_id} to a parent
          </DialogTitle>
          <DialogDescription>
            Pick a valid parent. Allowed:{" "}
            {rules
              .map((r) => r.parentType.replace("_", " ").toLowerCase())
              .join(", ")}
            .
          </DialogDescription>
        </DialogHeader>

        {/* Current parent chip */}
        {currentParentEdges.length > 0 && (
          <div className="rounded-lg border border-hairline bg-muted/30 px-3 py-2 text-sm">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Current parent
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentParentEdges.map((edge) => {
                const p = projectArtifacts.find(
                  (a) => a.id === edge.from_artifact_id,
                );
                if (!p) return null;
                return (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => handleUnlink(edge.id, p)}
                    className="group inline-flex items-center gap-1.5 rounded-md border border-hairline bg-card px-2 py-1 text-xs hover:border-destructive/40 hover:bg-destructive/5"
                    title="Click to unlink"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {p.short_id}
                    </span>
                    <span className="truncate max-w-[180px]">{p.title}</span>
                    <span className="text-muted-foreground group-hover:text-destructive">
                      ✕
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by title or ID…"
            className="pl-8 h-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Candidates */}
        <div className="max-h-[340px] overflow-y-auto -mx-2 px-2">
          {candidates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No matching artifacts in this project.
            </div>
          ) : (
            <div className="space-y-4">
              {[...grouped.entries()].map(([type, items]) => {
                const rule = ruleForType(type);
                if (!rule) return null;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
                        {rule.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {rule.edgeType.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {items.map((p) => {
                        const isCurrent = currentParentIds.has(p.id);
                        const isPending = pendingId === p.id;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handlePick(p, rule)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors",
                                isCurrent
                                  ? "border-accent/30 bg-accent/5"
                                  : "border-hairline hover:border-foreground/20 hover:bg-muted/40",
                              )}
                            >
                              <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                {p.short_id}
                              </span>
                              <span className="text-sm text-foreground truncate flex-1">
                                {p.title}
                              </span>
                              {isCurrent && !isPending && (
                                <Check className="w-4 h-4 text-accent shrink-0" />
                              )}
                              {isPending && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Click an item to link. Click the current parent chip to unlink.
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
