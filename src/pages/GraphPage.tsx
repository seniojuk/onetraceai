import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter,
  LayoutGrid,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts, ArtifactType } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

// Custom node component
function ArtifactNode({ data }: { data: { label: string; type: ArtifactType; shortId: string; status: string } }) {
  const typeColors: Record<ArtifactType, string> = {
    IDEA: "border-l-yellow-500",
    PRD: "border-l-purple-500",
    EPIC: "border-l-blue-500",
    STORY: "border-l-teal-500",
    ACCEPTANCE_CRITERION: "border-l-green-500",
    TEST_CASE: "border-l-amber-500",
    TEST_SUITE: "border-l-orange-500",
    CODE_MODULE: "border-l-slate-500",
    COMMIT: "border-l-gray-500",
    PULL_REQUEST: "border-l-indigo-500",
    BUG: "border-l-red-500",
    DECISION: "border-l-cyan-500",
    RELEASE: "border-l-emerald-500",
    DEPLOYMENT: "border-l-violet-500",
  };

  const typeLabels: Record<ArtifactType, string> = {
    IDEA: "Idea",
    PRD: "PRD",
    EPIC: "Epic",
    STORY: "Story",
    ACCEPTANCE_CRITERION: "AC",
    TEST_CASE: "Test",
    TEST_SUITE: "Suite",
    CODE_MODULE: "Module",
    COMMIT: "Commit",
    PULL_REQUEST: "PR",
    BUG: "Bug",
    DECISION: "Decision",
    RELEASE: "Release",
    DEPLOYMENT: "Deploy",
  };

  return (
    <div className={cn(
      "px-4 py-3 bg-card border-2 rounded-lg shadow-md border-l-4 min-w-[180px] max-w-[250px]",
      typeColors[data.type]
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="secondary" className="text-xs">
          {typeLabels[data.type]}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">{data.shortId}</span>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2">{data.label}</p>
      <div className={cn(
        "w-2 h-2 rounded-full mt-2",
        data.status === "DONE" ? "bg-green-500" :
        data.status === "IN_PROGRESS" ? "bg-amber-500" :
        data.status === "BLOCKED" ? "bg-red-500" :
        "bg-slate-400"
      )} />
    </div>
  );
}

const nodeTypes = {
  artifact: ArtifactNode,
};

const GraphPage = () => {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  
  const { currentProjectId, graphViewMode, setGraphViewMode, artifactTypeFilter, setArtifactTypeFilter } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);

  // Generate nodes from artifacts
  const initialNodes: Node[] = useMemo(() => {
    if (!artifacts) return [];
    
    const filteredArtifacts = artifactTypeFilter.length > 0
      ? artifacts.filter(a => artifactTypeFilter.includes(a.type))
      : artifacts;

    // Simple hierarchical layout
    const typeOrder: ArtifactType[] = ["PRD", "EPIC", "STORY", "ACCEPTANCE_CRITERION", "TEST_CASE"];
    const grouped: Record<string, typeof filteredArtifacts> = {};
    
    filteredArtifacts.forEach(a => {
      if (!grouped[a.type]) grouped[a.type] = [];
      grouped[a.type].push(a);
    });

    const nodes: Node[] = [];
    let yOffset = 0;

    typeOrder.forEach((type) => {
      if (grouped[type]) {
        grouped[type].forEach((artifact, i) => {
          nodes.push({
            id: artifact.id,
            type: "artifact",
            position: { x: i * 280, y: yOffset },
            data: {
              label: artifact.title,
              type: artifact.type,
              shortId: artifact.short_id,
              status: artifact.status,
            },
          });
        });
        yOffset += 150;
      }
    });

    // Add remaining types
    Object.entries(grouped).forEach(([type, items]) => {
      if (!typeOrder.includes(type as ArtifactType)) {
        items.forEach((artifact, i) => {
          nodes.push({
            id: artifact.id,
            type: "artifact",
            position: { x: i * 280, y: yOffset },
            data: {
              label: artifact.title,
              type: artifact.type as ArtifactType,
              shortId: artifact.short_id,
              status: artifact.status,
            },
          });
        });
        yOffset += 150;
      }
    });

    return nodes;
  }, [artifacts, artifactTypeFilter]);

  // Generate edges based on parent relationships
  const initialEdges: Edge[] = useMemo(() => {
    if (!artifacts) return [];
    
    return artifacts
      .filter(a => a.parent_artifact_id)
      .map(a => ({
        id: `${a.parent_artifact_id}-${a.id}`,
        source: a.parent_artifact_id!,
        target: a.id,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
        },
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 },
      }));
  }, [artifacts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Update nodes when artifacts change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const artifactTypes: { value: ArtifactType; label: string }[] = [
    { value: "PRD", label: "PRD" },
    { value: "EPIC", label: "Epic" },
    { value: "STORY", label: "Story" },
    { value: "ACCEPTANCE_CRITERION", label: "AC" },
    { value: "TEST_CASE", label: "Test" },
    { value: "BUG", label: "Bug" },
  ];

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppLayout>
        <div className="h-[calc(100vh-0px)] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-graph-bg"
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
            }}
          >
            <Background color="hsl(var(--graph-grid))" gap={20} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const type = node.data?.type as ArtifactType;
                const colors: Record<ArtifactType, string> = {
                  PRD: "#9333ea",
                  EPIC: "#3b82f6",
                  STORY: "#14b8a6",
                  ACCEPTANCE_CRITERION: "#22c55e",
                  TEST_CASE: "#f59e0b",
                  TEST_SUITE: "#f97316",
                  CODE_MODULE: "#64748b",
                  COMMIT: "#6b7280",
                  PULL_REQUEST: "#6366f1",
                  BUG: "#ef4444",
                  IDEA: "#eab308",
                  DECISION: "#06b6d4",
                  RELEASE: "#10b981",
                  DEPLOYMENT: "#8b5cf6",
                };
                return colors[type] || "#64748b";
              }}
              className="!bg-card border border-border rounded-lg"
            />

            {/* Custom Panel */}
            <Panel position="top-left" className="m-4">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Artifact Graph</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {nodes.length} artifacts • {edges.length} connections
                  </p>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                          {artifactTypeFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{artifactTypeFilter.length}</Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {artifactTypes.map((type) => (
                          <DropdownMenuCheckboxItem
                            key={type.value}
                            checked={artifactTypeFilter.includes(type.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setArtifactTypeFilter([...artifactTypeFilter, type.value]);
                              } else {
                                setArtifactTypeFilter(artifactTypeFilter.filter(t => t !== type.value));
                              }
                            }}
                          >
                            {type.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <LayoutGrid className="w-4 h-4 mr-2" />
                          Layout
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuCheckboxItem
                          checked={graphViewMode === "hierarchy"}
                          onCheckedChange={() => setGraphViewMode("hierarchy")}
                        >
                          Hierarchy
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={graphViewMode === "force"}
                          onCheckedChange={() => setGraphViewMode("force")}
                        >
                          Force-Directed
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={graphViewMode === "radial"}
                          onCheckedChange={() => setGraphViewMode("radial")}
                        >
                          Radial
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </Panel>

            {/* Legend */}
            <Panel position="bottom-left" className="m-4">
              <Card className="shadow-lg">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { color: "bg-purple-500", label: "PRD" },
                      { color: "bg-blue-500", label: "Epic" },
                      { color: "bg-teal-500", label: "Story" },
                      { color: "bg-green-500", label: "AC" },
                      { color: "bg-amber-500", label: "Test" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1">
                        <div className={cn("w-3 h-3 rounded", item.color)} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default GraphPage;
