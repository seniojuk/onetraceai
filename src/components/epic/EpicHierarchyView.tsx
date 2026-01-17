import { useState, useMemo, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  ExternalLink,
  GitBranch,
  Layers,
  Search,
  Filter,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useProjectArtifactEdges, ArtifactEdge, useCreateArtifactEdge, EdgeType } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EpicWithStories {
  epic: Artifact;
  stories: Artifact[];
  storyCount: number;
  sourcePrd?: Artifact;
}

interface EpicHierarchyViewProps {
  projectId?: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function EpicHierarchyView({ projectId }: EpicHierarchyViewProps) {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const effectiveProjectId = projectId || currentProjectId;

  const { data: allArtifacts, isLoading: artifactsLoading } = useArtifacts(effectiveProjectId || undefined);
  const { data: edges, isLoading: edgesLoading } = useProjectArtifactEdges(effectiveProjectId || undefined);
  const createEdge = useCreateArtifactEdge();

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dragOverEpicId, setDragOverEpicId] = useState<string | null>(null);
  const [draggingStoryId, setDraggingStoryId] = useState<string | null>(null);

  // Build epic hierarchy from edges
  const epicHierarchy = useMemo((): EpicWithStories[] => {
    if (!allArtifacts || !edges) return [];

    const epics = allArtifacts.filter(a => a.type === "EPIC" && a.status !== "ARCHIVED");
    const stories = allArtifacts.filter(a => a.type === "STORY" && a.status !== "ARCHIVED");
    const prds = allArtifacts.filter(a => a.type === "PRD");
    const storyMap = new Map(stories.map(s => [s.id, s]));
    const prdMap = new Map(prds.map(p => [p.id, p]));

    // Find Epic → Story edges (PARENT_OF)
    const epicStoryEdges = edges.filter(e => e.edge_type === "PARENT_OF");
    const epicToStoriesMap = new Map<string, string[]>();

    epicStoryEdges.forEach(edge => {
      const epicId = edge.from_artifact_id;
      const storyId = edge.to_artifact_id;
      if (!epicToStoriesMap.has(epicId)) {
        epicToStoriesMap.set(epicId, []);
      }
      epicToStoriesMap.get(epicId)!.push(storyId);
    });

    // Find PRD → Epic edges (DERIVES_FROM where to_artifact is Epic)
    const prdToEpicEdges = edges.filter(e => e.edge_type === "DERIVES_FROM");
    const epicToPrdMap = new Map<string, string>();
    
    prdToEpicEdges.forEach(edge => {
      // DERIVES_FROM: from = source (PRD), to = target (Epic)
      const epicId = edge.to_artifact_id;
      const prdId = edge.from_artifact_id;
      // Only map if the target is an Epic
      if (epics.some(e => e.id === epicId) && prds.some(p => p.id === prdId)) {
        epicToPrdMap.set(epicId, prdId);
      }
    });

    return epics.map(epic => {
      const storyIds = epicToStoriesMap.get(epic.id) || [];
      const linkedStories = storyIds
        .map(id => storyMap.get(id))
        .filter((s): s is Artifact => !!s);

      const sourcePrdId = epicToPrdMap.get(epic.id);
      const sourcePrd = sourcePrdId ? prdMap.get(sourcePrdId) : undefined;

      return {
        epic,
        stories: linkedStories,
        storyCount: linkedStories.length,
        sourcePrd,
      };
    }).sort((a, b) => {
      // Sort by story count descending, then by title
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      return a.epic.title.localeCompare(b.epic.title);
    });
  }, [allArtifacts, edges]);

  // Filter epics based on search and priority
  const filteredHierarchy = useMemo(() => {
    return epicHierarchy.filter(({ epic, stories }) => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        epic.title.toLowerCase().includes(lowerQuery) ||
        epic.short_id.toLowerCase().includes(lowerQuery) ||
        stories.some(s => 
          s.title.toLowerCase().includes(lowerQuery) ||
          s.short_id.toLowerCase().includes(lowerQuery)
        );

      const epicPriority = (epic.content_json as any)?.priority?.toLowerCase();
      const matchesPriority =
        priorityFilter === "all" || epicPriority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [epicHierarchy, searchQuery, priorityFilter]);

  // Unlinked stories (stories not connected to any epic)
  const unlinkedStories = useMemo(() => {
    if (!allArtifacts || !edges) return [];

    const stories = allArtifacts.filter(a => a.type === "STORY" && a.status !== "ARCHIVED");
    const linkedStoryIds = new Set(
      edges.filter(e => e.edge_type === "PARENT_OF").map(e => e.to_artifact_id)
    );

    return stories.filter(s => !linkedStoryIds.has(s.id));
  }, [allArtifacts, edges]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEpics(new Set(filteredHierarchy.map(h => h.epic.id)));
  };

  const collapseAll = () => {
    setExpandedEpics(new Set());
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, storyId: string) => {
    e.dataTransfer.setData("storyId", storyId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingStoryId(storyId);
  };

  const handleDragEnd = () => {
    setDraggingStoryId(null);
    setDragOverEpicId(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, epicId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverEpicId(epicId);
  };

  const handleDragLeave = () => {
    setDragOverEpicId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, epicId: string) => {
    e.preventDefault();
    setDragOverEpicId(null);
    setDraggingStoryId(null);

    const storyId = e.dataTransfer.getData("storyId");
    if (!storyId || !currentWorkspaceId || !effectiveProjectId) return;

    try {
      await createEdge.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: effectiveProjectId,
        fromArtifactId: epicId,
        toArtifactId: storyId,
        edgeType: EdgeType.PARENT_OF,
        source: "MANUAL",
      });
      toast.success("Story linked to epic");
    } catch (error) {
      console.error("Failed to link story:", error);
      toast.error("Failed to link story to epic");
    }
  };

  const isLoading = artifactsLoading || edgesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Epic Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <div className="pl-8 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalEpics = filteredHierarchy.length;
  const totalLinkedStories = filteredHierarchy.reduce((acc, h) => acc + h.storyCount, 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Epic Hierarchy
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {totalEpics} Epics
            </Badge>
            <Badge variant="outline">
              {totalLinkedStories} Linked Stories
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics or stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-2 pr-4">
            {filteredHierarchy.length === 0 && unlinkedStories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No epics found</p>
                <p className="text-sm">Create epics from a PRD to see them here</p>
              </div>
            ) : (
              <>
                {filteredHierarchy.map(({ epic, stories, storyCount, sourcePrd }) => {
                  const isExpanded = expandedEpics.has(epic.id);
                  const epicData = epic.content_json as any;
                  const priority = epicData?.priority?.toLowerCase() || "medium";

                  return (
                    <Collapsible
                      key={epic.id}
                      open={isExpanded}
                      onOpenChange={() => toggleEpic(epic.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            "hover:bg-accent/50",
                            isExpanded && "bg-accent/30 border-primary/30",
                            dragOverEpicId === epic.id && "ring-2 ring-primary bg-primary/10 border-primary"
                          )}
                          onDragOver={(e) => handleDragOver(e, epic.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, epic.id)}
                        >
                          <div className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>

                          <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                            <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {epic.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {epic.short_id}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{storyCount} {storyCount === 1 ? "story" : "stories"}</span>
                              {sourcePrd && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/artifacts/${sourcePrd.id}`);
                                    }}
                                    className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">
                                      {sourcePrd.short_id}
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", priorityColors[priority])}>
                              {priority}
                            </Badge>
                            <Badge className={cn("text-xs", statusColors[epic.status || "DRAFT"])}>
                              {epic.status || "DRAFT"}
                            </Badge>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/artifacts/${epic.id}`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-muted pl-4">
                          {stories.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-2 italic">
                              No stories linked to this epic
                            </div>
                          ) : (
                            stories.map(story => {
                              const storyData = story.content_json as any;
                              const storyPriority = storyData?.priority?.toLowerCase() || "medium";
                              const storyPoints = storyData?.storyPoints;

                              return (
                                <div
                                  key={story.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                    "hover:bg-accent/50"
                                  )}
                                  onClick={() => navigate(`/artifacts/${story.id}`)}
                                >
                                  <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm truncate">
                                        {story.title}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {story.short_id}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {storyPoints && (
                                      <Badge variant="secondary" className="text-xs">
                                        {storyPoints} pts
                                      </Badge>
                                    )}
                                    <Badge className={cn("text-xs", priorityColors[storyPriority])}>
                                      {storyPriority}
                                    </Badge>
                                  </div>

                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {/* Unlinked Stories Section */}
                {unlinkedStories.length > 0 && (
                  <Collapsible
                    open={expandedEpics.has("unlinked")}
                    onOpenChange={() => toggleEpic("unlinked")}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors border-dashed",
                          "hover:bg-accent/50",
                          expandedEpics.has("unlinked") && "bg-muted/50"
                        )}
                      >
                        <div className="text-muted-foreground">
                          {expandedEpics.has("unlinked") ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </div>

                        <div className="p-2 rounded-md bg-muted">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">
                              Unlinked Stories
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Drag stories onto epics to link them
                          </div>
                        </div>

                        <Badge variant="outline" className="text-xs">
                          {unlinkedStories.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-dashed border-muted pl-4">
                        {unlinkedStories.map(story => {
                          const storyData = story.content_json as any;
                          const storyPriority = storyData?.priority?.toLowerCase() || "medium";
                          const storyPoints = storyData?.storyPoints;

                          return (
                            <div
                              key={story.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, story.id)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-grab transition-all",
                                "hover:bg-accent/50",
                                draggingStoryId === story.id && "opacity-50 ring-2 ring-primary"
                              )}
                              onClick={() => navigate(`/artifacts/${story.id}`)}
                            >
                              <div className="p-1 rounded text-muted-foreground hover:text-foreground cursor-grab">
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>

                              <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm truncate">
                                    {story.title}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {story.short_id}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {storyPoints && (
                                  <Badge variant="secondary" className="text-xs">
                                    {storyPoints} pts
                                  </Badge>
                                )}
                                <Badge className={cn("text-xs", priorityColors[storyPriority])}>
                                  {storyPriority}
                                </Badge>
                              </div>

                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
