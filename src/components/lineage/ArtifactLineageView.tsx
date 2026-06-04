import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  FileText,
  Loader2,
  GitBranch,
  Filter,
  RefreshCw,
  Info,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useArtifactLineage, type LineageNode as LineageNodeType, type ArtifactWithLineage } from "@/hooks/useArtifactLineage";
import { useUIStore } from "@/store/uiStore";
import type { PipelineRun } from "@/hooks/useAgentPipelines";
import { format } from "date-fns";

// Custom node for pipeline runs
function PipelineRunNode({ data }: { data: { pipelineRun: PipelineRun; isSelected?: boolean } }) {
  const run = data.pipelineRun;
  const statusTone: Record<string, { dot: string; text: string }> = {
    completed: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    failed:    { dot: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400" },
    running:   { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" },
    pending:   { dot: "bg-slate-400",   text: "text-muted-foreground" },
    cancelled: { dot: "bg-slate-400",   text: "text-muted-foreground" },
  };
  const tone = statusTone[run.status] || statusTone.pending;
  const isRunning = run.status === "running";

  return (
    <div
      className={cn(
        "group relative w-[240px] cursor-pointer rounded-xl bg-card/95 backdrop-blur-sm overflow-hidden",
        "border border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.08)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-8px_rgba(0,0,0,0.14)] hover:border-border",
        data.isSelected && "ring-2 ring-accent/40 border-accent/60",
      )}
    >
      <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-full", tone.dot)} />
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              Pipeline
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className={cn("text-[9px] font-semibold uppercase tracking-[0.14em]", tone.text)}>
              {run.status}
            </span>
          </div>
          {isRunning && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
        </div>
        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
          {run.pipeline?.name || "Unknown pipeline"}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {format(new Date(run.created_at), "MMM d · HH:mm")}
          </span>
          {run.step_results.length > 0 && (
            <div className="flex items-center gap-[3px]">
              {run.step_results.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 w-3 rounded-full",
                    step.status === "completed" ? "bg-emerald-500" :
                    step.status === "failed" ? "bg-rose-500" :
                    step.status === "running" ? "bg-amber-500" :
                    "bg-border",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom node for artifacts
function ArtifactLineageNode({ data }: { data: { artifact: ArtifactWithLineage; isSelected?: boolean } }) {
  const artifact = data.artifact;
  const typeDot: Record<string, string> = {
    IDEA: "bg-yellow-500",
    PRD: "bg-purple-500",
    EPIC: "bg-blue-500",
    STORY: "bg-teal-500",
    ACCEPTANCE_CRITERION: "bg-emerald-500",
    TEST_CASE: "bg-amber-500",
    DECISION: "bg-cyan-500",
  };
  const dot = typeDot[artifact.type] || "bg-slate-400";
  const isPipelineGenerated = !!artifact.pipelineRunId;

  return (
    <div
      className={cn(
        "group relative w-[220px] cursor-pointer rounded-xl bg-card/95 backdrop-blur-sm",
        "border border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_10px_24px_-8px_rgba(0,0,0,0.14)] hover:border-border",
        data.isSelected && "ring-2 ring-accent/40 border-accent/60",
      )}
    >
      <div className="px-3.5 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            {artifact.type.replace("_", " ")}
          </span>
          <span className="ml-auto text-[9px] font-mono text-muted-foreground/70 tabular-nums">
            {artifact.short_id}
          </span>
        </div>
        <p className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-2">
          {artifact.title}
        </p>
        {isPipelineGenerated && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-accent/90">
            <GitBranch className="w-2.5 h-2.5" />
            <span className="font-medium">Pipeline generated</span>
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  pipelineRun: PipelineRunNode,
  artifactNode: ArtifactLineageNode,
};

interface ArtifactLineageViewProps {
  projectId?: string;
  workspaceId?: string;
}

function ArtifactLineageViewInner({ projectId, workspaceId }: ArtifactLineageViewProps) {
  const navigate = useNavigate();
  const { data: lineageData, isLoading, refetch } = useArtifactLineage(projectId, workspaceId);
  
  const [selectedNode, setSelectedNode] = useState<LineageNodeType | null>(null);
  const [showPipelineRuns, setShowPipelineRuns] = useState(true);
  const [showLinkedArtifactsOnly, setShowLinkedArtifactsOnly] = useState(false);

  // Filter and create nodes — proper lane-per-run layout so each pipeline
  // run owns a vertical band and its artifacts stack neatly to the right.
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!lineageData) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Layout constants
    const COL_RUN_X = 40;
    const COL_ART_X = 360;
    const COL_ORPHAN_X = 720;
    const RUN_NODE_H = 116;
    const ART_NODE_H = 92;
    const LANE_GAP = 28;       // gap between pipeline lanes
    const ART_GAP = 14;        // gap between artifacts inside a lane
    const TOP_PAD = 32;

    const pipelineRunIds = new Set(
      lineageData.artifacts.filter(a => a.pipelineRunId).map(a => a.pipelineRunId!),
    );
    const linkedArtifactIds = new Set(lineageData.edges.map(e => e.target));

    // Group artifacts by pipeline run
    const artifactsByRun = new Map<string, typeof lineageData.nodes>();
    const orphanArtifacts: typeof lineageData.nodes = [];

    lineageData.nodes
      .filter(n => n.type === "artifact")
      .filter(n => !showLinkedArtifactsOnly || linkedArtifactIds.has(n.id))
      .forEach((node) => {
        const a = node.data.artifact!;
        if (a.pipelineRunId && showPipelineRuns) {
          const key = `run-${a.pipelineRunId}`;
          const arr = artifactsByRun.get(key) ?? [];
          arr.push(node);
          artifactsByRun.set(key, arr);
        } else {
          orphanArtifacts.push(node);
        }
      });

    const runNodes = showPipelineRuns
      ? lineageData.nodes
          .filter(n => n.type === "pipeline_run")
          .filter(n => !showLinkedArtifactsOnly || pipelineRunIds.has(n.data.pipelineRun!.id))
      : [];

    // Place pipeline run lanes
    let cursorY = TOP_PAD;
    runNodes.forEach((node) => {
      const childArts = artifactsByRun.get(node.id) ?? [];
      const childrenHeight = childArts.length > 0
        ? childArts.length * ART_NODE_H + (childArts.length - 1) * ART_GAP
        : RUN_NODE_H;
      const laneHeight = Math.max(RUN_NODE_H, childrenHeight);

      // Center the run node vertically within its lane
      const runY = cursorY + (laneHeight - RUN_NODE_H) / 2;
      nodes.push({
        id: node.id,
        type: "pipelineRun",
        position: { x: COL_RUN_X, y: runY },
        data: {
          pipelineRun: node.data.pipelineRun,
          isSelected: selectedNode?.id === node.id,
        },
      });

      // Stack artifacts in this lane
      childArts.forEach((child, ci) => {
        const y = cursorY + ci * (ART_NODE_H + ART_GAP);
        nodes.push({
          id: child.id,
          type: "artifactNode",
          position: { x: COL_ART_X, y },
          data: {
            artifact: child.data.artifact,
            isSelected: selectedNode?.id === child.id,
          },
        });
      });

      cursorY += laneHeight + LANE_GAP;
    });

    // Place orphan / unlinked artifacts in their own column
    orphanArtifacts.forEach((node, i) => {
      nodes.push({
        id: node.id,
        type: "artifactNode",
        position: {
          x: runNodes.length > 0 ? COL_ORPHAN_X : COL_RUN_X,
          y: (runNodes.length > 0 ? TOP_PAD : TOP_PAD) + i * (ART_NODE_H + ART_GAP),
        },
        data: {
          artifact: node.data.artifact,
          isSelected: selectedNode?.id === node.id,
        },
      });
    });

    // Edges — thin, calm, accent-tinted
    if (showPipelineRuns) {
      lineageData.edges.forEach(edge => {
        edges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: "hsl(var(--accent))",
          },
          style: {
            stroke: "hsl(var(--accent))",
            strokeWidth: 1.25,
            strokeOpacity: 0.55,
          },
        });
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [lineageData, showPipelineRuns, showLinkedArtifactsOnly, selectedNode]);


  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const lineageNode = lineageData?.nodes.find(n => n.id === node.id);
      setSelectedNode(lineageNode || null);
    },
    [lineageData]
  );

  const handleNavigate = useCallback(() => {
    if (selectedNode?.type === "artifact" && selectedNode.data.artifact) {
      navigate(`/artifacts/${selectedNode.data.artifact.id}`);
    }
  }, [selectedNode, navigate]);

  // Stats
  const stats = useMemo(() => {
    if (!lineageData) return { totalRuns: 0, totalArtifacts: 0, linkedArtifacts: 0 };
    
    return {
      totalRuns: lineageData.pipelineRuns.filter(r => r.status === "completed").length,
      totalArtifacts: lineageData.artifacts.length,
      linkedArtifacts: lineageData.artifacts.filter(a => a.pipelineRunId).length,
    };
  }, [lineageData]);

  // Recent activity feed for the inspector idle state
  const recentActivity = useMemo(() => {
    if (!lineageData) return [];
    const items: Array<{
      id: string;
      title: string;
      meta: string;
      tone: "accent" | "success" | "danger" | "muted";
    }> = [];

    lineageData.pipelineRuns
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .forEach((r) => {
        items.push({
          id: `run-${r.id}`,
          title: `${r.pipeline?.name || "Pipeline"} ${r.status}`,
          meta: format(new Date(r.created_at), "MMM d, HH:mm"),
          tone:
            r.status === "completed"
              ? "success"
              : r.status === "failed"
              ? "danger"
              : r.status === "running"
              ? "accent"
              : "muted",
        });
      });

    lineageData.artifacts
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .forEach((a) => {
        items.push({
          id: `art-${a.id}`,
          title: `${a.short_id} • ${a.title}`,
          meta: format(new Date(a.created_at), "MMM d, HH:mm"),
          tone: a.pipelineRunId ? "accent" : "muted",
        });
      });

    return items.slice(0, 5);
  }, [lineageData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex gap-4">
      {/* Main Graph */}
      <div className="flex-1 rounded-xl border bg-card overflow-hidden shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-muted/20"
        >
          <Background color="hsl(var(--muted-foreground))" gap={24} size={1} />
          <Controls className="!bg-card/90 !backdrop-blur-sm !border !rounded-lg !shadow-sm overflow-hidden" />
          <MiniMap
            className="!bg-card/90 !backdrop-blur-sm !border !rounded-lg !shadow-sm"
            maskColor="hsl(var(--muted) / 0.6)"
            nodeColor={(node) =>
              node.type === "pipelineRun"
                ? "hsl(var(--accent))"
                : "hsl(var(--primary))"
            }
          />

          <Panel position="top-left">
            <div className="flex items-center gap-0 bg-card/90 backdrop-blur-sm border rounded-lg shadow-sm p-1.5">
              <div className="flex items-center gap-2 px-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-xs font-medium text-muted-foreground">
                  Pipeline Runs ({stats.totalRuns})
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2 px-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  Artifacts ({stats.totalArtifacts})
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2 px-2.5">
                <GitBranch className="w-3 h-3 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">
                  Linked ({stats.linkedArtifacts})
                </span>
              </div>
            </div>
          </Panel>

          <Panel position="top-right" className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card/90 backdrop-blur-sm shadow-sm h-8"
                >
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={showPipelineRuns}
                  onCheckedChange={setShowPipelineRuns}
                >
                  Show Pipeline Runs
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showLinkedArtifactsOnly}
                  onCheckedChange={setShowLinkedArtifactsOnly}
                >
                  Linked Artifacts Only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="bg-card/90 backdrop-blur-sm shadow-sm h-8 w-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Side Panel */}
      <div className="w-80 shrink-0">
        <div className="h-full rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">
                {selectedNode ? "Node Details" : "Lineage Overview"}
              </h3>
            </div>
            {selectedNode && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedNode(null)}
              >
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 w-full">
            <div className="p-5 w-80 max-w-full">

              {selectedNode ? (
                <div className="space-y-4">
                  {selectedNode.type === "pipeline_run" && selectedNode.data.pipelineRun && (
                    <PipelineRunDetails run={selectedNode.data.pipelineRun} />
                  )}
                  {selectedNode.type === "artifact" && selectedNode.data.artifact && (
                    <ArtifactDetails
                      artifact={selectedNode.data.artifact}
                      onNavigate={handleNavigate}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <GitBranch className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                      Select a pipeline run or artifact to inspect its lineage.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      At a glance
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-lg font-bold text-foreground tabular-nums">
                          {stats.totalRuns}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          Runs
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-lg font-bold text-foreground tabular-nums">
                          {stats.totalArtifacts}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          Artifacts
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-lg font-bold text-accent tabular-nums">
                          {stats.linkedArtifacts}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          Linked
                        </div>
                      </div>
                    </div>
                  </div>

                  {recentActivity.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                        Recent activity
                      </h4>
                      <div className="space-y-2.5">
                        {recentActivity.map((item) => (
                          <div key={item.id} className="flex gap-3">
                            <div
                              className={cn(
                                "w-0.5 rounded-full shrink-0",
                                item.tone === "success" && "bg-green-500",
                                item.tone === "danger" && "bg-red-500",
                                item.tone === "accent" && "bg-accent",
                                item.tone === "muted" && "bg-border",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {item.meta}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function PipelineRunDetails({ run }: { run: PipelineRun }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold flex items-center gap-2">
          <Play className="w-4 h-4 text-accent" />
          {run.pipeline?.name || "Pipeline Run"}
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          {run.pipeline?.description || "No description"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={run.status === "completed" ? "default" : "secondary"}>
            {run.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span>{format(new Date(run.created_at), "MMM d, yyyy HH:mm")}</span>
        </div>
        {run.completed_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span>{format(new Date(run.completed_at), "MMM d, yyyy HH:mm")}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Steps</span>
          <span>{run.step_results.length}</span>
        </div>
      </div>

      {run.step_results.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Step Results</h5>
          <div className="space-y-1">
            {run.step_results.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  step.status === "completed" ? "bg-green-500" :
                  step.status === "failed" ? "bg-red-500" : "bg-slate-400"
                )} />
                <span className="flex-1 truncate">{step.agentName}</span>
                {step.durationMs && (
                  <span className="text-muted-foreground">{step.durationMs}ms</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArtifactDetails({ 
  artifact, 
  onNavigate 
}: { 
  artifact: ArtifactWithLineage;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary">{artifact.type.replace("_", " ")}</Badge>
          <span className="text-xs text-muted-foreground font-mono">{artifact.short_id}</span>
        </div>
        <h4 className="font-semibold">{artifact.title}</h4>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant="outline">{artifact.status}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span>{format(new Date(artifact.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      {artifact.pipelineRunId && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2 text-sm font-medium text-accent mb-1">
            <GitBranch className="w-4 h-4" />
            Pipeline Generated
          </div>
          <p className="text-xs text-muted-foreground">
            Generated by: {artifact.pipelineName || "Unknown Pipeline"}
          </p>
          {artifact.generatedAt && (
            <p className="text-xs text-muted-foreground">
              At: {format(new Date(artifact.generatedAt), "MMM d, yyyy HH:mm")}
            </p>
          )}
        </div>
      )}

      <Button onClick={onNavigate} className="w-full" variant="outline">
        <ArrowRight className="w-4 h-4 mr-2" />
        View Artifact
      </Button>
    </div>
  );
}

export function ArtifactLineageView(props: ArtifactLineageViewProps) {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <ArtifactLineageViewInner {...props} />
      </ReactFlowProvider>
    </TooltipProvider>
  );
}
