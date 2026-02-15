import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import { 
  Filter,
  LayoutGrid,
  Loader2,
  GitBranch,
  X,
  MousePointer,
  ExternalLink,
  Search,
  Download,
  Image,
  FileCode,
  Trash2,
  Info,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts, ArtifactType, Artifact } from "@/hooks/useArtifacts";
import { useProjectArtifactEdges, useCreateArtifactEdge, useDeleteArtifactEdge, EdgeType, ArtifactEdge } from "@/hooks/useArtifactEdges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Custom node component
function ArtifactNode({ data }: { data: { label: string; type: ArtifactType; shortId: string; status: string; isHighlighted?: boolean; isUpstream?: boolean; isSelected?: boolean; isDimmed?: boolean; isSearchMatch?: boolean } }) {
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
    FILE: "border-l-stone-500",
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
    FILE: "File",
  };

  return (
    <div className={cn(
      "px-4 py-3 bg-card border-2 rounded-lg shadow-md border-l-4 min-w-[180px] max-w-[250px] cursor-pointer transition-all relative",
      typeColors[data.type],
      data.isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      data.isHighlighted && "ring-2 ring-amber-500 ring-offset-1 ring-offset-background shadow-lg shadow-amber-500/20",
      data.isUpstream && "ring-2 ring-blue-500 ring-offset-1 ring-offset-background shadow-lg shadow-blue-500/20",
      data.isSearchMatch && "ring-2 ring-green-500 ring-offset-1 ring-offset-background shadow-lg shadow-green-500/20",
      data.isDimmed && "opacity-30",
      !data.isDimmed && "hover:shadow-lg hover:border-primary/50"
    )}>
      {/* Source handle (right side) - drag from here to create connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background hover:!bg-primary/80 transition-colors"
      />
      {/* Target handle (left side) - drop connections here */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background hover:!bg-primary transition-colors"
      />
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

const GraphPageInner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const { fitView, setCenter } = useReactFlow();
  
  const { currentProjectId, currentWorkspaceId, graphViewMode, setGraphViewMode, artifactTypeFilter, setArtifactTypeFilter } = useUIStore();
  const { data: artifacts, isLoading: artifactsLoading } = useArtifacts(currentProjectId || undefined);
  const { data: artifactEdges, isLoading: edgesLoading } = useProjectArtifactEdges(currentProjectId || undefined);
  const createEdge = useCreateArtifactEdge();
  const deleteEdgeMutation = useDeleteArtifactEdge();

  const isLoading = artifactsLoading || edgesLoading;

  // Impact analysis state
  const [impactAnalysisMode, setImpactAnalysisMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Edge creation dialog state
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType>(EdgeType.RELATED);
  const [isCreatingEdge, setIsCreatingEdge] = useState(false);

  // Edge inspection & deletion state
  const [selectedEdge, setSelectedEdge] = useState<ArtifactEdge | null>(null);
  const [isDeletingEdge, setIsDeletingEdge] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Artifact[]>([]);
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(0);

  // Search artifacts
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !artifacts) {
      setSearchResults([]);
      setFocusedSearchIndex(0);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results = artifacts.filter(a => 
      a.title.toLowerCase().includes(lowerQuery) ||
      a.short_id.toLowerCase().includes(lowerQuery) ||
      a.type.toLowerCase().includes(lowerQuery)
    );
    setSearchResults(results);
    setFocusedSearchIndex(0);
  }, [artifacts]);

  // Focus on a specific node
  const focusOnNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 125, node.position.y + 50, { zoom: 1.5, duration: 500 });
    }
  }, [setCenter]);

  // Navigate search results
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSearchIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSearchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const artifact = searchResults[focusedSearchIndex];
      if (artifact) {
        focusOnNode(artifact.id);
        setSearchQuery("");
        setSearchResults([]);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchResults, focusedSearchIndex, focusOnNode]);

  // Get search match IDs for highlighting
  const searchMatchIds = useMemo(() => {
    return new Set(searchResults.map(a => a.id));
  }, [searchResults]);

  // Find all downstream artifacts (artifacts that depend on the selected one)
  const getDownstreamArtifacts = useCallback((nodeId: string, edges: ArtifactEdge[]): Set<string> => {
    const downstream = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Find edges where the current node is the source (from_artifact_id)
      edges.forEach(edge => {
        if (edge.from_artifact_id === current && !downstream.has(edge.to_artifact_id)) {
          downstream.add(edge.to_artifact_id);
          queue.push(edge.to_artifact_id);
        }
      });
    }
    
    return downstream;
  }, []);

  // Find all upstream artifacts (artifacts that the selected one depends on)
  const getUpstreamArtifacts = useCallback((nodeId: string, edges: ArtifactEdge[]): Set<string> => {
    const upstream = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Find edges where the current node is the target (to_artifact_id)
      edges.forEach(edge => {
        if (edge.to_artifact_id === current && !upstream.has(edge.from_artifact_id)) {
          upstream.add(edge.from_artifact_id);
          queue.push(edge.from_artifact_id);
        }
      });
    }
    
    return upstream;
  }, []);

  // Get impacted artifacts for the selected node
  const downstreamArtifactIds = useMemo(() => {
    if (!selectedNodeId || !artifactEdges) return new Set<string>();
    return getDownstreamArtifacts(selectedNodeId, artifactEdges);
  }, [selectedNodeId, artifactEdges, getDownstreamArtifacts]);

  const upstreamArtifactIds = useMemo(() => {
    if (!selectedNodeId || !artifactEdges) return new Set<string>();
    return getUpstreamArtifacts(selectedNodeId, artifactEdges);
  }, [selectedNodeId, artifactEdges, getUpstreamArtifacts]);

  // Get artifact details for impacted nodes
  const downstreamArtifacts = useMemo(() => {
    if (!artifacts) return [];
    return artifacts.filter(a => downstreamArtifactIds.has(a.id));
  }, [artifacts, downstreamArtifactIds]);

  const upstreamArtifacts = useMemo(() => {
    if (!artifacts) return [];
    return artifacts.filter(a => upstreamArtifactIds.has(a.id));
  }, [artifacts, upstreamArtifactIds]);

  const selectedArtifact = useMemo(() => {
    if (!selectedNodeId || !artifacts) return null;
    return artifacts.find(a => a.id === selectedNodeId);
  }, [selectedNodeId, artifacts]);

  // Generate nodes from artifacts with impact analysis highlighting
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

    const createNodeData = (artifact: Artifact) => {
      const isSelected = impactAnalysisMode && selectedNodeId === artifact.id;
      const isHighlighted = impactAnalysisMode && downstreamArtifactIds.has(artifact.id);
      const isUpstream = impactAnalysisMode && upstreamArtifactIds.has(artifact.id);
      const isSearchMatch = searchMatchIds.has(artifact.id);
      const isDimmed = impactAnalysisMode && selectedNodeId && !isSelected && !isHighlighted && !isUpstream;
      return {
        label: artifact.title,
        type: artifact.type,
        shortId: artifact.short_id,
        status: artifact.status,
        isSelected,
        isHighlighted,
        isUpstream,
        isSearchMatch,
        isDimmed,
      };
    };

    typeOrder.forEach((type) => {
      if (grouped[type]) {
        grouped[type].forEach((artifact, i) => {
          nodes.push({
            id: artifact.id,
            type: "artifact",
            position: { x: i * 280, y: yOffset },
            data: createNodeData(artifact),
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
            data: createNodeData(artifact),
          });
        });
        yOffset += 150;
      }
    });

    return nodes;
  }, [artifacts, artifactTypeFilter, impactAnalysisMode, selectedNodeId, downstreamArtifactIds, upstreamArtifactIds, searchMatchIds]);

  // Edge type colors for different relationship types
  const edgeTypeStyles: Record<string, { stroke: string; label: string }> = {
    [EdgeType.DERIVES_FROM]: { stroke: "#9333ea", label: "derives" },
    [EdgeType.VALIDATES]: { stroke: "#22c55e", label: "validates" },
    [EdgeType.IMPLEMENTS]: { stroke: "#3b82f6", label: "implements" },
    [EdgeType.BLOCKS]: { stroke: "#ef4444", label: "blocks" },
    [EdgeType.RELATED]: { stroke: "#6b7280", label: "relates" },
    [EdgeType.SUPERSEDES]: { stroke: "#f59e0b", label: "supersedes" },
    [EdgeType.CONTAINS]: { stroke: "#14b8a6", label: "contains" },
    [EdgeType.SATISFIES]: { stroke: "#8b5cf6", label: "satisfies" },
    [EdgeType.DEPENDS_ON]: { stroke: "#f97316", label: "depends" },
  };

  // Get the set of visible node IDs for edge filtering
  const visibleNodeIds = useMemo(() => {
    return new Set(initialNodes.map(n => n.id));
  }, [initialNodes]);

  // Generate edges from artifact_edges table
  const initialEdges: Edge[] = useMemo(() => {
    if (!artifactEdges || artifactEdges.length === 0) {
      // Fallback to parent relationships if no edges exist
      if (!artifacts) return [];
      return artifacts
        .filter(a => a.parent_artifact_id && visibleNodeIds.has(a.id) && visibleNodeIds.has(a.parent_artifact_id))
        .map(a => ({
          id: `parent-${a.parent_artifact_id}-${a.id}`,
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
    }
    
    // Filter edges to only include those where both nodes are visible
    return artifactEdges
      .filter(edge => visibleNodeIds.has(edge.from_artifact_id) && visibleNodeIds.has(edge.to_artifact_id))
      .map(edge => {
        const edgeStyle = edgeTypeStyles[edge.edge_type as EdgeType] || edgeTypeStyles[EdgeType.RELATED];
        return {
          id: edge.id,
          source: edge.from_artifact_id,
          target: edge.to_artifact_id,
          type: "smoothstep",
          animated: edge.edge_type === EdgeType.BLOCKS,
          label: edgeStyle.label,
          labelStyle: { fontSize: 10, fill: edgeStyle.stroke },
          labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: edgeStyle.stroke,
          },
          style: { stroke: edgeStyle.stroke, strokeWidth: 2 },
        };
      });
  }, [artifactEdges, artifacts, visibleNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Instead of immediately adding the edge, show a dialog to select edge type
      setPendingConnection(connection);
      setSelectedEdgeType(EdgeType.RELATED);
    },
    []
  );

  // Get artifact names for the pending connection
  const sourceArtifact = useMemo(() => {
    if (!pendingConnection?.source || !artifacts) return null;
    return artifacts.find(a => a.id === pendingConnection.source);
  }, [pendingConnection, artifacts]);

  const targetArtifact = useMemo(() => {
    if (!pendingConnection?.target || !artifacts) return null;
    return artifacts.find(a => a.id === pendingConnection.target);
  }, [pendingConnection, artifacts]);

  // Handle edge creation confirmation
  const handleCreateEdge = useCallback(async () => {
    if (!pendingConnection?.source || !pendingConnection?.target || !currentWorkspaceId || !currentProjectId) {
      toast.error("Missing connection details");
      return;
    }

    setIsCreatingEdge(true);
    try {
      await createEdge.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        fromArtifactId: pendingConnection.source,
        toArtifactId: pendingConnection.target,
        edgeType: selectedEdgeType,
        source: "MANUAL",
      });
      toast.success("Connection created successfully");
      setPendingConnection(null);
    } catch (error) {
      console.error("Failed to create edge:", error);
      toast.error("Failed to create connection");
    } finally {
      setIsCreatingEdge(false);
    }
  }, [pendingConnection, currentWorkspaceId, currentProjectId, selectedEdgeType, createEdge]);

  const handleCancelConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (impactAnalysisMode) {
        // In impact analysis mode, toggle selection
        setSelectedNodeId(prev => prev === node.id ? null : node.id);
      } else {
        // In navigation mode, navigate to artifact detail
        navigate(`/artifacts/${node.id}`);
      }
    },
    [navigate, impactAnalysisMode]
  );

  const clearImpactAnalysis = useCallback(() => {
    setSelectedNodeId(null);
    setImpactAnalysisMode(false);
  }, []);

  // Handle edge click for inspection
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (!artifactEdges) return;
      const dbEdge = artifactEdges.find(e => e.id === edge.id);
      if (dbEdge) {
        setSelectedEdge(dbEdge);
        setShowDeleteConfirm(false);
      }
    },
    [artifactEdges]
  );

  // Handle edge deletion
  const handleDeleteEdge = useCallback(async () => {
    if (!selectedEdge || !currentProjectId) return;
    setIsDeletingEdge(true);
    try {
      await deleteEdgeMutation.mutateAsync({
        edgeId: selectedEdge.id,
        projectId: currentProjectId,
      });
      toast.success("Connection deleted");
      setSelectedEdge(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete edge:", error);
      toast.error("Failed to delete connection");
    } finally {
      setIsDeletingEdge(false);
    }
  }, [selectedEdge, currentProjectId, deleteEdgeMutation]);

  // Export graph as image
  const exportAsImage = useCallback(async (format: 'png' | 'svg') => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      toast.error("Could not find graph viewport");
      return;
    }

    try {
      toast.loading("Generating image...", { id: "export" });
      
      // Get the bounds of all nodes
      const nodesBounds = getNodesBounds(nodes);
      const padding = 50;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      const imageOptions = {
        backgroundColor: 'hsl(222.2 84% 4.9%)', // dark background
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
      };

      let dataUrl: string;
      if (format === 'svg') {
        dataUrl = await toSvg(viewport, imageOptions);
      } else {
        dataUrl = await toPng(viewport, { ...imageOptions, pixelRatio: 2 });
      }

      // Create download link
      const link = document.createElement('a');
      link.download = `artifact-graph.${format}`;
      link.href = dataUrl;
      link.click();

      toast.success(`Graph exported as ${format.toUpperCase()}`, { id: "export" });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export graph", { id: "export" });
    }
  }, [nodes]);

  // Update nodes first, then edges after a brief delay to ensure nodes are registered
  useEffect(() => {
    setNodes(initialNodes);
    // Set edges after nodes are registered with React Flow
    const timer = setTimeout(() => {
      setEdges(initialEdges);
    }, 50);
    return () => clearTimeout(timer);
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
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
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
                  FILE: "#78716c",
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
                  <p className="text-sm text-muted-foreground mb-3">
                    {nodes.length} artifacts • {edges.length} connections
                  </p>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artifacts..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="pl-9 h-9"
                    />
                    {searchResults.length > 0 && (
                      <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
                        <ScrollArea className="max-h-48">
                          <div className="p-1">
                            {searchResults.map((artifact, index) => (
                              <div
                                key={artifact.id}
                                className={cn(
                                  "px-3 py-2 rounded cursor-pointer flex items-center justify-between",
                                  index === focusedSearchIndex ? "bg-accent" : "hover:bg-accent/50"
                                )}
                                onClick={() => {
                                  focusOnNode(artifact.id);
                                  setSearchQuery("");
                                  setSearchResults([]);
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{artifact.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="secondary" className="text-xs">{artifact.type}</Badge>
                                    <span className="text-xs text-muted-foreground font-mono">{artifact.short_id}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </Card>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* Impact Analysis Toggle */}
                    <Button 
                      variant={impactAnalysisMode ? "default" : "outline"} 
                      size="sm"
                      onClick={() => {
                        setImpactAnalysisMode(!impactAnalysisMode);
                        if (impactAnalysisMode) setSelectedNodeId(null);
                      }}
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      Impact
                    </Button>

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

                    {/* Export Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportAsImage('png')}>
                          <Image className="w-4 h-4 mr-2" />
                          Export as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportAsImage('svg')}>
                          <FileCode className="w-4 h-4 mr-2" />
                          Export as SVG
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Impact Analysis Mode Hint */}
                  {impactAnalysisMode && !selectedNodeId && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      Click a node to see its downstream impact
                    </p>
                  )}
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

            {/* Impact Analysis Results Panel */}
            {impactAnalysisMode && selectedNodeId && selectedArtifact && (
              <Panel position="top-right" className="m-4">
                <Card className="shadow-lg w-80">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-amber-500" />
                        Impact Analysis
                      </h3>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearImpactAnalysis}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Selected Node */}
                    <div className="mb-3 p-2 bg-primary/10 rounded-md border border-primary/20">
                      <p className="text-xs text-muted-foreground">Selected</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedArtifact.title}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{selectedArtifact.type}</Badge>
                    </div>

                    {/* Upstream Artifacts */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Upstream Dependencies ({upstreamArtifacts.length})
                      </p>
                      {upstreamArtifacts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No upstream artifacts</p>
                      ) : (
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {upstreamArtifacts.map(artifact => (
                              <div 
                                key={artifact.id}
                                className="p-2 bg-blue-500/10 rounded-md border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors"
                                onClick={() => navigate(`/artifacts/${artifact.id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground truncate flex-1">{artifact.title}</p>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-2 flex-shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{artifact.type}</Badge>
                                  <span className="text-xs text-muted-foreground font-mono">{artifact.short_id}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Downstream Artifacts */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Downstream Impact ({downstreamArtifacts.length})
                      </p>
                      {downstreamArtifacts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No downstream artifacts</p>
                      ) : (
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {downstreamArtifacts.map(artifact => (
                              <div 
                                key={artifact.id}
                                className="p-2 bg-amber-500/10 rounded-md border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
                                onClick={() => navigate(`/artifacts/${artifact.id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground truncate flex-1">{artifact.title}</p>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-2 flex-shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{artifact.type}</Badge>
                                  <span className="text-xs text-muted-foreground font-mono">{artifact.short_id}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Panel>
            )}
          </ReactFlow>

          {/* Edge Type Selection Dialog */}
          <Dialog open={!!pendingConnection} onOpenChange={(open) => !open && handleCancelConnection()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Connection</DialogTitle>
                <DialogDescription>
                  Choose the relationship type between these artifacts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">From</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">{sourceArtifact?.title}</p>
                    <p className="text-xs text-muted-foreground">{sourceArtifact?.type} • {sourceArtifact?.short_id}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">To</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">{targetArtifact?.title}</p>
                    <p className="text-xs text-muted-foreground">{targetArtifact?.type} • {targetArtifact?.short_id}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edge-type">Relationship Type</Label>
                  <Select value={selectedEdgeType} onValueChange={(value) => setSelectedEdgeType(value as EdgeType)}>
                    <SelectTrigger id="edge-type">
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EdgeType.CONTAINS}>Contains</SelectItem>
                      <SelectItem value={EdgeType.DERIVES_FROM}>Derives From</SelectItem>
                      <SelectItem value={EdgeType.IMPLEMENTS}>Implements</SelectItem>
                      <SelectItem value={EdgeType.SATISFIES}>Satisfies</SelectItem>
                      <SelectItem value={EdgeType.VALIDATES}>Validates</SelectItem>
                      <SelectItem value={EdgeType.DEPENDS_ON}>Depends On</SelectItem>
                      <SelectItem value={EdgeType.BLOCKS}>Blocks</SelectItem>
                      <SelectItem value={EdgeType.SUPERSEDES}>Supersedes</SelectItem>
                      <SelectItem value={EdgeType.RELATED}>Related To</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelConnection}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEdge} disabled={isCreatingEdge}>
                  {isCreatingEdge ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Connection"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edge Details Sidebar Panel */}
          {selectedEdge && !impactAnalysisMode && (
            <div className="fixed top-20 right-4 z-50 w-80">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-accent" />
                      Edge Details
                    </h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedEdge(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* From / To */}
                  <div className="space-y-2 mb-3">
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="text-sm font-medium truncate">
                        {artifacts?.find(a => a.id === selectedEdge.from_artifact_id)?.title || "Unknown"}
                      </p>
                      <span className="text-xs text-muted-foreground font-mono">
                        {artifacts?.find(a => a.id === selectedEdge.from_artifact_id)?.short_id}
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">To</p>
                      <p className="text-sm font-medium truncate">
                        {artifacts?.find(a => a.id === selectedEdge.to_artifact_id)?.title || "Unknown"}
                      </p>
                      <span className="text-xs text-muted-foreground font-mono">
                        {artifacts?.find(a => a.id === selectedEdge.to_artifact_id)?.short_id}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="secondary">{selectedEdge.edge_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Source</span>
                      <Badge variant="outline">{selectedEdge.source}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-sm font-medium">{Math.round((selectedEdge.confidence ?? 1) * 100)}%</span>
                    </div>
                    {selectedEdge.source_ref && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ref</span>
                        <span className="text-xs font-mono truncate max-w-[160px]">{selectedEdge.source_ref}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-xs">{selectedEdge.created_at ? new Date(selectedEdge.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>

                  {/* Custom Metadata */}
                  {selectedEdge.metadata && Object.keys(selectedEdge.metadata).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                      <pre className="text-xs bg-muted rounded-md p-2 overflow-auto max-h-24">
                        {JSON.stringify(selectedEdge.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Delete action */}
                  {!showDeleteConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Connection
                    </Button>
                  ) : (
                    <div className="space-y-2 p-2 border border-destructive/30 rounded-md bg-destructive/5">
                      <p className="text-xs text-destructive">Are you sure? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteEdge} disabled={isDeletingEdge}>
                          {isDeletingEdge ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

// Wrapper component to provide ReactFlow context
const GraphPage = () => {
  return (
    <ReactFlowProvider>
      <GraphPageInner />
    </ReactFlowProvider>
  );
};

export default GraphPage;
