import { useState, useMemo, useEffect, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  GitBranch,
  Layers,
  Search,
  GripVertical,
  Link2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtifacts, Artifact } from "@/hooks/useArtifacts";
import {
  useProjectArtifactEdges,
  useCreateArtifactEdge,
  useDeleteArtifactEdge,
  EdgeType,
} from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LinkArtifactDialog } from "@/components/artifacts/LinkArtifactDialog";

interface EpicWithStories {
  epic: Artifact;
  stories: Artifact[];
  storyCount: number;
  sourcePrd?: Artifact;
}

interface EpicHierarchyViewProps {
  projectId?: string;
}

/* Priority tag — only render for non-default (high) to avoid wallpapering rows */
const isHighPriority = (p?: string) => p?.toLowerCase() === "high";
const isLowPriority = (p?: string) => p?.toLowerCase() === "low";

export function EpicHierarchyView({ projectId }: EpicHierarchyViewProps) {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const effectiveProjectId = projectId || currentProjectId;

  const { data: allArtifacts, isLoading: artifactsLoading } = useArtifacts(
    effectiveProjectId || undefined,
  );
  const { data: edges, isLoading: edgesLoading } = useProjectArtifactEdges(
    effectiveProjectId || undefined,
  );
  const createEdge = useCreateArtifactEdge();
  const deleteEdge = useDeleteArtifactEdge();

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dragOverEpicId, setDragOverEpicId] = useState<string | null>(null);
  const [dragOverUnlinked, setDragOverUnlinked] = useState(false);
  const [draggingStoryId, setDraggingStoryId] = useState<string | null>(null);
  const [draggingFromEpicId, setDraggingFromEpicId] = useState<string | null>(
    null,
  );
  const [linkTarget, setLinkTarget] = useState<Artifact | null>(null);

  // Track which epic the cursor is hovering during a drag, to auto-expand it
  const hoverExpandTimer = useRef<number | null>(null);

  // ESC cancels an in-flight drag — calmer escape hatch
  useEffect(() => {
    if (!draggingStoryId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraggingStoryId(null);
        setDraggingFromEpicId(null);
        setDragOverEpicId(null);
        setDragOverUnlinked(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draggingStoryId]);

  const epicHierarchy = useMemo((): EpicWithStories[] => {
    if (!allArtifacts || !edges) return [];

    const epics = allArtifacts.filter(
      (a) => a.type === "EPIC" && a.status !== "ARCHIVED",
    );
    const stories = allArtifacts.filter(
      (a) => a.type === "STORY" && a.status !== "ARCHIVED",
    );
    const prds = allArtifacts.filter((a) => a.type === "PRD");
    const storyMap = new Map(stories.map((s) => [s.id, s]));
    const prdMap = new Map(prds.map((p) => [p.id, p]));

    const epicStoryEdges = edges.filter((e) => e.edge_type === "CONTAINS");
    const epicToStoriesMap = new Map<string, string[]>();
    epicStoryEdges.forEach((edge) => {
      if (!epicToStoriesMap.has(edge.from_artifact_id))
        epicToStoriesMap.set(edge.from_artifact_id, []);
      epicToStoriesMap.get(edge.from_artifact_id)!.push(edge.to_artifact_id);
    });

    const prdToEpicEdges = edges.filter((e) => e.edge_type === "DERIVES_FROM");
    const epicToPrdMap = new Map<string, string>();
    prdToEpicEdges.forEach((edge) => {
      if (
        epics.some((e) => e.id === edge.to_artifact_id) &&
        prds.some((p) => p.id === edge.from_artifact_id)
      ) {
        epicToPrdMap.set(edge.to_artifact_id, edge.from_artifact_id);
      }
    });

    return epics
      .map((epic) => {
        const storyIds = epicToStoriesMap.get(epic.id) || [];
        const linkedStories = storyIds
          .map((id) => storyMap.get(id))
          .filter((s): s is Artifact => !!s);
        const sourcePrdId = epicToPrdMap.get(epic.id);
        return {
          epic,
          stories: linkedStories,
          storyCount: linkedStories.length,
          sourcePrd: sourcePrdId ? prdMap.get(sourcePrdId) : undefined,
        };
      })
      .sort((a, b) => {
        if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
        return a.epic.title.localeCompare(b.epic.title);
      });
  }, [allArtifacts, edges]);

  const filteredHierarchy = useMemo(() => {
    return epicHierarchy.filter(({ epic, stories }) => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        epic.title.toLowerCase().includes(lowerQuery) ||
        epic.short_id.toLowerCase().includes(lowerQuery) ||
        stories.some(
          (s) =>
            s.title.toLowerCase().includes(lowerQuery) ||
            s.short_id.toLowerCase().includes(lowerQuery),
        );
      const epicPriority = (epic.content_json as any)?.priority?.toLowerCase();
      const matchesPriority =
        priorityFilter === "all" || epicPriority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [epicHierarchy, searchQuery, priorityFilter]);

  const unlinkedStories = useMemo(() => {
    if (!allArtifacts || !edges) return [];
    const stories = allArtifacts.filter(
      (a) => a.type === "STORY" && a.status !== "ARCHIVED",
    );
    const linkedStoryIds = new Set(
      edges
        .filter((e) => e.edge_type === "CONTAINS")
        .map((e) => e.to_artifact_id),
    );
    return stories.filter((s) => !linkedStoryIds.has(s.id));
  }, [allArtifacts, edges]);

  const toggleEpic = (id: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedEpics(new Set(filteredHierarchy.map((h) => h.epic.id)));
  const collapseAll = () => setExpandedEpics(new Set());

  // ── DnD ────────────────────────────────────────────────────────────────
  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    storyId: string,
    fromEpicId?: string,
  ) => {
    e.dataTransfer.setData("storyId", storyId);
    if (fromEpicId) e.dataTransfer.setData("fromEpicId", fromEpicId);
    e.dataTransfer.effectAllowed = "move";

    // Use the row element itself as the drag image so the user sees what they're moving
    const target = e.currentTarget as HTMLElement;
    try {
      e.dataTransfer.setDragImage(target, 12, 12);
    } catch {
      /* noop — some browsers */
    }

    setDraggingStoryId(storyId);
    setDraggingFromEpicId(fromEpicId || null);
  };

  const clearHoverTimer = () => {
    if (hoverExpandTimer.current) {
      window.clearTimeout(hoverExpandTimer.current);
      hoverExpandTimer.current = null;
    }
  };

  const handleDragEnd = () => {
    clearHoverTimer();
    setDraggingStoryId(null);
    setDraggingFromEpicId(null);
    setDragOverEpicId(null);
    setDragOverUnlinked(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, epicId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverEpicId === epicId) return;
    setDragOverEpicId(epicId);
    setDragOverUnlinked(false);

    // Auto-expand collapsed epic after a short dwell so user can see what they're dropping into
    clearHoverTimer();
    if (!expandedEpics.has(epicId)) {
      hoverExpandTimer.current = window.setTimeout(() => {
        setExpandedEpics((prev) => new Set(prev).add(epicId));
      }, 450);
    }
  };

  const handleEpicDragLeave = () => {
    clearHoverTimer();
    setDragOverEpicId(null);
  };

  const handleUnlinkedDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverUnlinked(true);
    setDragOverEpicId(null);
    clearHoverTimer();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, epicId: string) => {
    e.preventDefault();
    clearHoverTimer();
    setDragOverEpicId(null);
    setDraggingStoryId(null);
    setDraggingFromEpicId(null);

    const storyId = e.dataTransfer.getData("storyId");
    const fromEpicId = e.dataTransfer.getData("fromEpicId");
    if (!storyId || !currentWorkspaceId || !effectiveProjectId) return;

    if (fromEpicId && fromEpicId !== epicId) {
      const oldEdge = edges?.find(
        (e) =>
          e.from_artifact_id === fromEpicId &&
          e.to_artifact_id === storyId &&
          e.edge_type === "CONTAINS",
      );
      if (oldEdge) {
        try {
          await deleteEdge.mutateAsync({
            edgeId: oldEdge.id,
            projectId: effectiveProjectId,
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
    try {
      await createEdge.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: effectiveProjectId,
        fromArtifactId: epicId,
        toArtifactId: storyId,
        edgeType: EdgeType.CONTAINS,
        source: "MANUAL",
      });
      toast.success("Story linked");
    } catch {
      toast.error("Failed to link story");
    }
  };

  const handleUnlinkedDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverUnlinked(false);
    setDraggingStoryId(null);
    setDraggingFromEpicId(null);

    const storyId = e.dataTransfer.getData("storyId");
    const fromEpicId = e.dataTransfer.getData("fromEpicId");
    if (!storyId || !fromEpicId || !effectiveProjectId) return;

    const edgeToDelete = edges?.find(
      (e) =>
        e.from_artifact_id === fromEpicId &&
        e.to_artifact_id === storyId &&
        e.edge_type === "CONTAINS",
    );
    if (!edgeToDelete) return toast.error("Link not found");

    try {
      await deleteEdge.mutateAsync({
        edgeId: edgeToDelete.id,
        projectId: effectiveProjectId,
      });
      toast.success("Story unlinked");
    } catch {
      toast.error("Failed to unlink");
    }
  };

  const isLoading = artifactsLoading || edgesLoading;
  const totalEpics = filteredHierarchy.length;
  const totalLinkedStories = filteredHierarchy.reduce(
    (a, h) => a + h.storyCount,
    0,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pulse strip — counts */}
      <section className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatTile label="Epics" value={totalEpics} />
          <StatTile label="Linked stories" value={totalLinkedStories} />
          <StatTile
            label="Unlinked stories"
            value={unlinkedStories.length}
            tone={unlinkedStories.length > 0 ? "warning" : "muted"}
          />
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search epics or stories…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-[13px]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-[12px] w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-[12px]"
            onClick={expandAll}
          >
            Expand all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-[12px]"
            onClick={collapseAll}
          >
            Collapse all
          </Button>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 px-0.5">
        <Sparkles className="w-3 h-3" />
        Drag stories between epics, or use{" "}
        <span className="text-foreground font-medium">Link</span> on any row.
      </div>

      {/* Tree */}
      <div className="space-y-1.5">
        {filteredHierarchy.length === 0 && unlinkedStories.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Layers className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-[13px] font-medium text-foreground">
              No epics yet
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Generate epics from a PRD to populate this view.
            </p>
          </div>
        ) : (
          <>
            {filteredHierarchy.map(({ epic, stories, storyCount, sourcePrd }) => {
              const isExpanded = expandedEpics.has(epic.id);
              const priority =
                (epic.content_json as any)?.priority?.toLowerCase() || "medium";

              return (
                <Collapsible
                  key={epic.id}
                  open={isExpanded}
                  onOpenChange={() => toggleEpic(epic.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "group relative flex items-center gap-3 px-3.5 py-3 rounded-lg border bg-card cursor-pointer transition-colors",
                        "hover:border-foreground/20",
                        isExpanded
                          ? "border-foreground/15 bg-muted/20 shadow-[0_1px_0_hsl(var(--border))]"
                          : "border-border",
                        // Calmer drop affordance: inset outline + faint tint, no jarring ring
                        dragOverEpicId === epic.id &&
                          "border-accent/60 bg-accent/[0.04] before:absolute before:inset-1 before:rounded-md before:border before:border-dashed before:border-accent/60 before:pointer-events-none",
                        // While ANY story is dragging, mark this as a valid landing area subtly
                        draggingStoryId &&
                          dragOverEpicId !== epic.id &&
                          "border-dashed",
                      )}
                      onDragOver={(e) => handleDragOver(e, epic.id)}
                      onDragLeave={handleEpicDragLeave}
                      onDrop={(e) => handleDrop(e, epic.id)}
                    >

                      <button
                        type="button"
                        className="text-muted-foreground/60 shrink-0"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {/* Type chip — establishes EPIC as a parent unit */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-status-epic/10 text-status-epic-fg shrink-0">
                        <GitBranch className="h-3 w-3" />
                        <span className="text-[10px] uppercase tracking-[0.1em] font-medium">
                          Epic
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] text-foreground truncate font-medium leading-snug">
                            {epic.title}
                          </span>
                          {isHighPriority(priority) && (
                            <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-destructive shrink-0">
                              High
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 mt-0.5">
                          <span className="font-mono text-[10px]">
                            {epic.short_id}
                          </span>
                          {sourcePrd && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/artifacts/${sourcePrd.id}`);
                                }}
                                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                {sourcePrd.short_id}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right rail: story count badge + actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] tabular-nums",
                            storyCount === 0
                              ? "text-muted-foreground/60"
                              : "text-foreground bg-muted/60",
                          )}
                          title={`${storyCount} ${storyCount === 1 ? "story" : "stories"}`}
                        >
                          <FileText className="h-3 w-3" />
                          {storyCount}
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkTarget(epic);
                            }}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/artifacts/${epic.id}`);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-[26px] mt-0.5 mb-1.5 pl-3 border-l border-dashed border-border/70">
                      {stories.length === 0 ? (
                        <div className="text-[12px] text-muted-foreground/80 py-2 px-2 italic">
                          No stories linked. Drag a story here, or use{" "}
                          <button
                            className="not-italic text-foreground hover:underline font-medium"
                            onClick={() => setLinkTarget(epic)}
                          >
                            Link
                          </button>
                          .
                        </div>
                      ) : (
                        stories.map((story) => (
                          <StoryRow
                            key={story.id}
                            story={story}
                            fromEpicId={epic.id}
                            draggingStoryId={draggingStoryId}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onLink={() => setLinkTarget(story)}
                            onOpen={() => navigate(`/artifacts/${story.id}`)}
                          />
                        ))
                      )}
                    </div>
                  </CollapsibleContent>

                </Collapsible>
              );
            })}

            {/* Unlinked drop zone */}
            {(unlinkedStories.length > 0 || draggingFromEpicId) && (
              <Collapsible
                open={expandedEpics.has("unlinked") || !!draggingFromEpicId}
                onOpenChange={() => toggleEpic("unlinked")}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border cursor-pointer transition-colors",
                      "hover:border-foreground/30 hover:bg-muted/30",
                      dragOverUnlinked &&
                        "border-destructive/60 bg-destructive/[0.04] before:absolute before:inset-1 before:rounded-md before:border before:border-dashed before:border-destructive/60 before:pointer-events-none",
                    )}
                    onDragOver={handleUnlinkedDragOver}
                    onDragLeave={() => setDragOverUnlinked(false)}
                    onDrop={handleUnlinkedDrop}
                  >

                    <button
                      type="button"
                      className="text-muted-foreground shrink-0"
                    >
                      {expandedEpics.has("unlinked") || draggingFromEpicId ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-muted-foreground">
                        {dragOverUnlinked
                          ? "Drop to unlink"
                          : "Unlinked stories"}
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {draggingFromEpicId
                          ? "Releases the story from its current epic"
                          : "Drag onto an epic above to link"}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal h-5 px-1.5"
                    >
                      {unlinkedStories.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-5 mt-1 mb-2 space-y-0.5 border-l border-dashed border-border pl-3">
                    {unlinkedStories.map((story) => (
                      <StoryRow
                        key={story.id}
                        story={story}
                        draggingStoryId={draggingStoryId}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onLink={() => setLinkTarget(story)}
                        onOpen={() => navigate(`/artifacts/${story.id}`)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </div>

      {linkTarget && (
        <LinkArtifactDialog
          open={!!linkTarget}
          onOpenChange={(o) => !o && setLinkTarget(null)}
          artifact={linkTarget}
        />
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "muted" | "warning";
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-xl font-semibold tracking-tight mt-0.5 tabular-nums",
          tone === "muted" && "text-muted-foreground",
          tone === "warning" && value > 0 && "text-warning",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StoryRow({
  story,
  fromEpicId,
  draggingStoryId,
  onDragStart,
  onDragEnd,
  onLink,
  onOpen,
}: {
  story: Artifact;
  fromEpicId?: string;
  draggingStoryId: string | null;
  onDragStart: (
    e: DragEvent<HTMLDivElement>,
    storyId: string,
    fromEpicId?: string,
  ) => void;
  onDragEnd: () => void;
  onLink: () => void;
  onOpen: () => void;
}) {
  const storyData = story.content_json as any;
  const storyPriority = storyData?.priority?.toLowerCase() || "medium";
  const storyPoints = storyData?.storyPoints;

  const isDragging = draggingStoryId === story.id;

  return (
    <div
      // Whole row is NOT draggable — click safely opens the story.
      onClick={onOpen}
      className={cn(
        "group flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-md cursor-pointer transition-colors",
        "hover:bg-muted/40",
        isDragging && "opacity-40",
      )}
    >
      {/* Drag handle — the ONLY draggable surface. Always visible at low contrast so users trust it. */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(e, story.id, fromEpicId);
        }}
        onDragEnd={onDragEnd}
        onClick={(e) => e.stopPropagation()}
        title="Drag to move to another epic"
        aria-label="Drag handle"
        className={cn(
          "flex items-center justify-center h-6 w-5 rounded shrink-0 transition-colors",
          "text-muted-foreground/50 hover:text-foreground hover:bg-muted",
          "cursor-grab active:cursor-grabbing",
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <span className="font-mono text-[10px] text-muted-foreground/70 shrink-0 w-[64px]">
        {story.short_id}
      </span>
      <span className="text-[12.5px] text-foreground/90 truncate flex-1 leading-snug">
        {story.title}
      </span>
      {isHighPriority(storyPriority) && (
        <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-destructive shrink-0">
          High
        </span>
      )}
      {isLowPriority(storyPriority) && (
        <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/60 shrink-0">
          Low
        </span>
      )}
      {storyPoints && (
        <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0 w-7 text-right">
          {storyPoints}pt
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLink();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0"
        aria-label="Link to parent"
      >
        <Link2 className="h-3 w-3" />
      </button>
    </div>
  );


}
