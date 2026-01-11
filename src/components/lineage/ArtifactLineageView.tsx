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
  const statusColors = {
    completed: "border-l-green-500 bg-green-500/5",
    failed: "border-l-red-500 bg-red-500/5",
    running: "border-l-amber-500 bg-amber-500/5",
    pending: "border-l-slate-500 bg-slate-500/5",
    cancelled: "border-l-gray-500 bg-gray-500/5",
  };

  const statusIcons = {
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    running: <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />,
    pending: <Clock className="w-4 h-4 text-slate-500" />,
    cancelled: <XCircle className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div
      className={cn(
        "px-4 py-3 bg-card border-2 rounded-lg shadow-md border-l-4 min-w-[200px] max-w-[280px] cursor-pointer transition-all",
        statusColors[run.status as keyof typeof statusColors] || statusColors.pending,
        data.isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-accent/10">
          <Play className="w-4 h-4 text-accent" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">Pipeline Run</span>
        {statusIcons[run.status as keyof typeof statusIcons]}
      </div>
      <p className="text-sm font-semibold text-foreground line-clamp-1">
        {run.pipeline?.name || "Unknown Pipeline"}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {format(new Date(run.created_at), "MMM d, HH:mm")}
      </div>
      {run.step_results.length > 0 && (
        <div className="mt-2 flex gap-1">
          {run.step_results.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full",
                step.status === "completed" ? "bg-green-500" :
                step.status === "failed" ? "bg-red-500" :
                step.status === "running" ? "bg-amber-500" :
                "bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Custom node for artifacts
function ArtifactLineageNode({ data }: { data: { artifact: ArtifactWithLineage; isSelected?: boolean } }) {
  const artifact = data.artifact;
  const typeColors: Record<string, string> = {
    IDEA: "border-l-yellow-500",
    PRD: "border-l-purple-500",
    EPIC: "border-l-blue-500",
    STORY: "border-l-teal-500",
    ACCEPTANCE_CRITERION: "border-l-green-500",
    TEST_CASE: "border-l-amber-500",
    DECISION: "border-l-cyan-500",
  };

  const isPipelineGenerated = !!artifact.pipelineRunId;

  return (
    <div
      className={cn(
        "px-4 py-3 bg-card border-2 rounded-lg shadow-md border-l-4 min-w-[180px] max-w-[250px] cursor-pointer transition-all hover:shadow-lg",
        typeColors[artifact.type] || "border-l-slate-500",
        data.isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="secondary" className="text-xs">
          {artifact.type.replace("_", " ")}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">{artifact.short_id}</span>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2">{artifact.title}</p>
      {isPipelineGenerated && (
        <div className="flex items-center gap-1 mt-2 text-xs text-accent">
          <GitBranch className="w-3 h-3" />
          <span>Pipeline generated</span>
        </div>
      )}
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

  // Filter and create nodes
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!lineageData) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Track pipeline runs for positioning
    const runPositions = new Map<string, { x: number; y: number }>();
    let runIndex = 0;
    
    // Filter pipeline runs and artifacts
    const pipelineRunIds = new Set(
      lineageData.artifacts
        .filter(a => a.pipelineRunId)
        .map(a => a.pipelineRunId!)
    );

    // Add pipeline run nodes
    if (showPipelineRuns) {
      lineageData.nodes
        .filter(n => n.type === "pipeline_run")
        .filter(n => !showLinkedArtifactsOnly || pipelineRunIds.has(n.data.pipelineRun!.id))
        .forEach((node, index) => {
          const x = 50;
          const y = index * 200 + 50;
          runPositions.set(node.id, { x, y });
          
          nodes.push({
            id: node.id,
            type: "pipelineRun",
            position: { x, y },
            data: {
              pipelineRun: node.data.pipelineRun,
              isSelected: selectedNode?.id === node.id,
            },
          });
          runIndex++;
        });
    }

    // Add artifact nodes
    const linkedArtifactIds = new Set(lineageData.edges.map(e => e.target));
    let artifactIndex = 0;
    
    lineageData.nodes
      .filter(n => n.type === "artifact")
      .filter(n => !showLinkedArtifactsOnly || linkedArtifactIds.has(n.id))
      .forEach((node) => {
        const artifact = node.data.artifact!;
        
        // Position artifact next to its source pipeline run
        let x = 400;
        let y = artifactIndex * 120 + 50;
        
        if (artifact.pipelineRunId && showPipelineRuns) {
          const runPos = runPositions.get(`run-${artifact.pipelineRunId}`);
          if (runPos) {
            x = runPos.x + 350;
            y = runPos.y;
          }
        }
        
        nodes.push({
          id: node.id,
          type: "artifactNode",
          position: { x, y },
          data: {
            artifact: node.data.artifact,
            isSelected: selectedNode?.id === node.id,
          },
        });
        
        if (!artifact.pipelineRunId || !showPipelineRuns) {
          artifactIndex++;
        }
      });

    // Add edges
    if (showPipelineRuns) {
      lineageData.edges.forEach(edge => {
        edges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: true,
          label: edge.label,
          labelStyle: { fontSize: 10, fill: "hsl(var(--accent))" },
          labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: "hsl(var(--accent))",
          },
          style: { stroke: "hsl(var(--accent))", strokeWidth: 2 },
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
      <div className="flex-1 border rounded-lg overflow-hidden bg-background/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background color="hsl(var(--muted-foreground))" gap={16} size={1} />
          <Controls className="bg-card border rounded-lg" />
          <MiniMap
            className="bg-card border rounded-lg"
            nodeColor={(node) =>
              node.type === "pipelineRun"
                ? "hsl(var(--accent))"
                : "hsl(var(--primary))"
            }
          />
          
          <Panel position="top-left" className="flex items-center gap-2">
            <div className="bg-card border rounded-lg p-2 shadow-md">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent" />
                  <span className="text-muted-foreground">Pipeline Runs ({stats.totalRuns})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-muted-foreground">Artifacts ({stats.totalArtifacts})</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3 h-3 text-accent" />
                  <span className="text-muted-foreground">Linked ({stats.linkedArtifacts})</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel position="top-right" className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
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
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Side Panel */}
      <div className="w-80 shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-accent" />
              Node Details
            </CardTitle>
            <CardDescription>
              Click on a node to see details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
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
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a node to view its details and lineage information</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
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
