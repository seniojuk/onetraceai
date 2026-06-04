import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  BackgroundVariant,
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
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
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
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  Sparkles,
  Ticket,
  GitPullRequest,
  TestTube2,
  Bug,
  Boxes,
  GitCommit,
  Rocket,
  Cloud,
  Lightbulb,
  ScrollText,
  File as FileIcon,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  type LucideIcon,
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
import { useCoverageSnapshots } from "@/hooks/useCoverage";
import { useDriftFindings } from "@/hooks/useDriftFindings";
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
import { useArtifactLineage } from "@/hooks/useArtifactLineage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// ── Layered DAG layout (Dagre) ────────────────────────────────────────────────
// Replaces "type-bucketed horizontal rows" with a proper left-to-right
// layered graph: x = depth from a root, y = sibling order within rank.
// Same approach React Flow's official docs recommend.
const NODE_W = 210;
const NODE_H = 88;

function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): Node[] {
  if (nodes.length === 0) return nodes;
  const g = new Dagre.graphlib.Graph({ multigraph: true })
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({
      rankdir: direction,
      nodesep: direction === "LR" ? 28 : 60,
      ranksep: direction === "LR" ? 110 : 90,
      marginx: 24,
      marginy: 24,
      ranker: "tight-tree",
    });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  Dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      ...n,
      // Dagre returns the *center* of each node; React Flow wants the top-left.
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
    };
  });
}

// ── Per-type visual language, matched to HeroFlow ─────────────────────────────
const TYPE_META: Record<string, { icon: LucideIcon; label: string; tone: string }> = {
  IDEA:                 { icon: Lightbulb,     label: "IDEA",    tone: "text-yellow-500" },
  PRD:                  { icon: FileText,      label: "PRD",     tone: "text-violet-500" },
  EPIC:                 { icon: Layers,        label: "EPIC",    tone: "text-blue-500" },
  STORY:                { icon: Sparkles,      label: "STORY",   tone: "text-accent" },
  ACCEPTANCE_CRITERION: { icon: CheckCircle2,  label: "AC",      tone: "text-emerald-500" },
  TEST_CASE:            { icon: TestTube2,     label: "TEST",    tone: "text-amber-500" },
  TEST_SUITE:           { icon: TestTube2,     label: "SUITE",   tone: "text-orange-500" },
  CODE_MODULE:          { icon: Boxes,         label: "MODULE",  tone: "text-slate-500" },
  COMMIT:               { icon: GitCommit,     label: "COMMIT",  tone: "text-muted-foreground" },
  PULL_REQUEST:         { icon: GitPullRequest,label: "PR",      tone: "text-indigo-500" },
  BUG:                  { icon: Bug,           label: "BUG",     tone: "text-red-500" },
  DECISION:             { icon: ScrollText,    label: "DECISION",tone: "text-cyan-500" },
  RELEASE:              { icon: Rocket,        label: "RELEASE", tone: "text-emerald-600" },
  DEPLOYMENT:           { icon: Cloud,         label: "DEPLOY",  tone: "text-violet-600" },
  FILE:                 { icon: FileIcon,      label: "FILE",    tone: "text-stone-500" },
  PIPELINE:             { icon: GitBranch,     label: "PIPELINE",tone: "text-accent" },
};

// Editorial artifact node — same DNA as the marketing HeroFlow card.
function ArtifactNode({ data }: { data: {
  label: string;
  type: ArtifactType | "PIPELINE";
  shortId: string;
  status: string;
  isHighlighted?: boolean;
  isUpstream?: boolean;
  isSelected?: boolean;
  isDimmed?: boolean;
  isSearchMatch?: boolean;
  coverageRatio?: number | null;
  hasDrift?: boolean;
  driftSeverity?: number | null;
  showOverlays?: boolean;
} }) {
  const meta = TYPE_META[data.type] ?? TYPE_META.FILE;
  const Icon = meta.icon;

  const accentRing =
    data.isSelected
      ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.10),0_6px_20px_-8px_hsl(var(--primary)/0.30)]"
      : data.isSearchMatch
        ? "border-emerald-500/50 shadow-[0_0_0_3px_hsl(142_71%_45%/0.12),0_6px_20px_-8px_hsl(142_71%_45%/0.30)]"
        : data.isHighlighted
          ? "border-accent/55 shadow-[0_0_0_3px_hsl(var(--accent)/0.10),0_6px_20px_-8px_hsl(var(--accent)/0.30)]"
          : data.isUpstream
            ? "border-blue-500/50 shadow-[0_0_0_3px_hsl(217_91%_60%/0.10),0_6px_20px_-8px_hsl(217_91%_60%/0.30)]"
            : "border-border shadow-[0_4px_14px_-6px_hsl(var(--foreground)/0.12)]";

  const coverageTone =
    data.coverageRatio == null
      ? null
      : data.coverageRatio >= 0.8
        ? "bg-emerald-500"
        : data.coverageRatio >= 0.5
          ? "bg-amber-500"
          : "bg-red-500";

  const statusDot =
    data.status === "DONE"
      ? "bg-emerald-500"
      : data.status === "IN_PROGRESS"
        ? "bg-accent"
        : data.status === "BLOCKED"
          ? "bg-red-500"
          : "bg-muted-foreground/50";

  return (
    <div
      className={cn(
        "group relative w-[200px] rounded-lg border bg-card/95 px-3 py-2.5 backdrop-blur transition-all",
        accentRing,
        data.isDimmed ? "opacity-25" : "hover:border-foreground/20",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !border-0 !bg-border"
      />

      {/* Header row: icon + kind + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={cn("h-3 w-3 shrink-0", meta.tone)} />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.status === "IN_PROGRESS" ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", statusDot)} />
            </span>
          ) : (
            <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mt-1.5 truncate text-[12px] font-medium tracking-tight text-foreground">
        {data.label}
      </div>

      {/* Meta line */}
      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
        {data.shortId}
        {data.coverageRatio != null && (
          <> · {Math.round(data.coverageRatio * 100)}% cov</>
        )}
      </div>

      {/* Coverage bar (subtle, only when overlays are on) */}
      {data.showOverlays && data.coverageRatio != null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", coverageTone)}
            style={{ width: `${Math.round(data.coverageRatio * 100)}%` }}
          />
        </div>
      )}

      {/* Drift indicator: small pulse in top-right corner */}
      {data.showOverlays && data.hasDrift && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-2 w-2",
            data.driftSeverity && data.driftSeverity >= 3 ? "text-red-500" : "text-amber-500",
          )}
          aria-label="Drift detected"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !border-0 !bg-border"
      />
    </div>
  );
}

const nodeTypes = {
  artifact: ArtifactNode,
};

const GraphPageInner = ({ onViewChange, currentView }: { onViewChange: (value: string) => void; currentView: "graph" | "lineage" }) => {
  const mode = currentView;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const lensParam = (searchParams.get("lens") ?? "none") as
    | "none" | "orphans" | "coverage-gaps" | "drift" | "recent";
  const { setCenter, fitView, getViewport } = useReactFlow();
  
  const { currentProjectId, currentWorkspaceId, graphViewMode, setGraphViewMode, artifactTypeFilter, setArtifactTypeFilter } = useUIStore();
  const { data: artifacts, isLoading: artifactsLoading } = useArtifacts(currentProjectId || undefined);
  const { data: artifactEdges, isLoading: edgesLoading } = useProjectArtifactEdges(currentProjectId || undefined);
  const createEdge = useCreateArtifactEdge();
  const deleteEdgeMutation = useDeleteArtifactEdge();
  const { data: coverageSnapshots } = useCoverageSnapshots(currentProjectId || undefined);
  const { data: driftFindings } = useDriftFindings(currentProjectId || undefined);
  const { data: lineageData } = useArtifactLineage(
    mode === "lineage" ? (currentProjectId || undefined) : undefined,
    mode === "lineage" ? (currentWorkspaceId || undefined) : undefined,
  );

  const isLoading = artifactsLoading || edgesLoading;

  const graphShellRef = useRef<HTMLDivElement | null>(null);
  const lensAnchorCenterRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  const getCurrentFlowCenter = useCallback(() => {
    const pane = graphShellRef.current?.querySelector(".react-flow") as HTMLElement | null;
    const paneRect = pane?.getBoundingClientRect();
    const vp = getViewport();
    if (!paneRect || !Number.isFinite(vp.zoom) || vp.zoom === 0) return null;
    return {
      x: (paneRect.width / 2 - vp.x) / vp.zoom,
      y: (paneRect.height / 2 - vp.y) / vp.zoom,
      zoom: vp.zoom,
    };
  }, [getViewport]);

  const setLens = useCallback((next: typeof lensParam) => {
    lensAnchorCenterRef.current = getCurrentFlowCenter();
    const params = new URLSearchParams(searchParams);
    if (next === "none") params.delete("lens");
    else params.set("lens", next);
    setSearchParams(params, { replace: true });
  }, [getCurrentFlowCenter, searchParams, setSearchParams]);

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

  // Edge type filter state
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string[]>([]);

  // Coverage & drift overlay toggle
  const [showOverlays, setShowOverlays] = useState(false);

  // Build coverage and drift lookup maps
  const coverageByArtifact = useMemo(() => {
    const map = new Map<string, number>();
    coverageSnapshots?.forEach(s => map.set(s.artifact_id, s.coverage_ratio));
    return map;
  }, [coverageSnapshots]);

  const driftByArtifact = useMemo(() => {
    const map = new Map<string, { hasDrift: boolean; maxSeverity: number }>();
    driftFindings?.filter(d => d.status === "OPEN").forEach(d => {
      if (d.primary_artifact_id) {
        const existing = map.get(d.primary_artifact_id);
        const sev = d.severity ?? 1;
        if (!existing || sev > existing.maxSeverity) {
          map.set(d.primary_artifact_id, { hasDrift: true, maxSeverity: sev });
        }
      }
      d.related_artifact_ids?.forEach(id => {
        const existing = map.get(id);
        const sev = d.severity ?? 1;
        if (!existing || sev > existing.maxSeverity) {
          map.set(id, { hasDrift: true, maxSeverity: sev });
        }
      });
    });
    return map;
  }, [driftFindings]);

  // Lens: a non-destructive overlay on the canvas. Computes which artifact ids
  // are "in" the lens; everything else gets dimmed but stays visible.
  const lensMatchIds = useMemo(() => {
    if (lensParam === "none" || !artifacts) return null;
    if (lensParam === "orphans") {
      const linked = new Set<string>();
      artifactEdges?.forEach(e => {
        linked.add(e.from_artifact_id);
        linked.add(e.to_artifact_id);
      });
      artifacts.forEach(a => {
        if (a.parent_artifact_id) {
          linked.add(a.id);
          linked.add(a.parent_artifact_id);
        }
      });
      return new Set(artifacts.filter(a => !linked.has(a.id)).map(a => a.id));
    }
    if (lensParam === "coverage-gaps") {
      return new Set(
        artifacts
          .filter(a => {
            const c = coverageByArtifact.get(a.id);
            return c == null || c < 0.5;
          })
          .map(a => a.id)
      );
    }
    if (lensParam === "drift") {
      return new Set(
        artifacts.filter(a => driftByArtifact.get(a.id)?.hasDrift).map(a => a.id)
      );
    }
    if (lensParam === "recent") {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      return new Set(
        artifacts.filter(a => new Date(a.updated_at).getTime() >= cutoff).map(a => a.id)
      );
    }
    return null;
  }, [lensParam, artifacts, artifactEdges, coverageByArtifact, driftByArtifact]);

  const lensActive = lensParam !== "none";
  const lensOverlaysOn = lensParam === "coverage-gaps" || lensParam === "drift";
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Artifact[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [pendingFocusNodeId, setPendingFocusNodeId] = useState<string | null>(null);
  const graphShellRef = useRef<HTMLDivElement | null>(null);

  // ⌘K / Ctrl+K opens the search palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Server-side trigram search via search_artifacts RPC, debounced.
  // Falls back to in-memory match if the project id is missing.
  const searchAbortRef = useRef<number | null>(null);
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchAbortRef.current) {
      window.clearTimeout(searchAbortRef.current);
      searchAbortRef.current = null;
    }
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    if (!currentProjectId) {
      // local fallback
      const lower = q.toLowerCase();
      setSearchResults(
        (artifacts ?? []).filter(a =>
          a.title.toLowerCase().includes(lower) ||
          a.short_id.toLowerCase().includes(lower) ||
          a.type.toLowerCase().includes(lower)
        )
      );
      return;
    }
    searchAbortRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_artifacts", {
        p_project_id: currentProjectId,
        p_query: q,
        p_limit: 50,
      });
      if (error) {
        console.error("search_artifacts failed", error);
        return;
      }
      // RPC returns a subset of Artifact; cast for the list UI.
      setSearchResults((data ?? []) as unknown as Artifact[]);
    }, 120);
  }, [currentProjectId, artifacts]);

  // Focus on a specific node
  const focusOnNodeRef = useRef<(nodeId: string) => void>(() => {});
  const focusOnNode = useCallback((nodeId: string) => {
    focusOnNodeRef.current(nodeId);
  }, []);

  const selectSearchResult = useCallback((artifact: Artifact) => {
    focusOnNode(artifact.id);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [focusOnNode]);

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
      const isSearchMatch = searchMatchIds.has(artifact.id) || focusedNodeId === artifact.id;
      const isLensMatch = lensMatchIds ? lensMatchIds.has(artifact.id) : false;
      const impactDim = impactAnalysisMode && selectedNodeId && !isSelected && !isHighlighted && !isUpstream;
      const lensDim = lensActive && !isLensMatch;
      const isDimmed = impactDim || lensDim;
      const drift = driftByArtifact.get(artifact.id);
      return {
        label: artifact.title,
        type: artifact.type,
        shortId: artifact.short_id,
        status: artifact.status,
        isSelected,
        isHighlighted: isHighlighted || (lensActive && isLensMatch),
        isUpstream,
        isSearchMatch,
        isDimmed,
        coverageRatio: coverageByArtifact.get(artifact.id) ?? null,
        hasDrift: drift?.hasDrift ?? false,
        driftSeverity: drift?.maxSeverity ?? null,
        showOverlays: showOverlays || lensOverlaysOn,
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
  }, [artifacts, artifactTypeFilter, impactAnalysisMode, selectedNodeId, downstreamArtifactIds, upstreamArtifactIds, searchMatchIds, focusedNodeId, coverageByArtifact, driftByArtifact, showOverlays, lensMatchIds, lensActive, lensOverlaysOn]);

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
          style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.25, opacity: 0.55 },
        }));
    }
    
    // Filter edges to only include those where both nodes are visible and edge type matches filter
    return artifactEdges
      .filter(edge => {
        if (!visibleNodeIds.has(edge.from_artifact_id) || !visibleNodeIds.has(edge.to_artifact_id)) return false;
        if (edgeTypeFilter.length > 0 && !edgeTypeFilter.includes(edge.edge_type)) return false;
        return true;
      })
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
          style: { stroke: edgeStyle.stroke, strokeWidth: 1.5, opacity: 0.75 },
        };
      });
  }, [artifactEdges, artifacts, visibleNodeIds, edgeTypeFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Keep focusOnNode implementation in sync with latest nodes/filters
  useEffect(() => {
    focusOnNodeRef.current = (nodeId: string) => {
      graphShellRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setFocusedNodeId(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNodeId(nodeId);
        setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, { zoom: 1.45, duration: 500 });
        return;
      }
      // Node likely filtered out — clear filter, then center next frame
      setPendingFocusNodeId(nodeId);
      setArtifactTypeFilter([]);
      setSelectedNodeId(nodeId);
    };
  }, [nodes, setCenter, setArtifactTypeFilter]);

  useEffect(() => {
    if (!pendingFocusNodeId) return;
    const node = nodes.find(n => n.id === pendingFocusNodeId);
    if (!node) return;
    setPendingFocusNodeId(null);
    window.requestAnimationFrame(() => {
      setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, { zoom: 1.45, duration: 500 });
    });
  }, [pendingFocusNodeId, nodes, setCenter]);

  // Auto-zoom to lens matches — same delightful "the canvas knows where to
  // look" feeling as the search palette. When the lens clears, gently
  // refit the whole graph.
  useEffect(() => {
    if (nodes.length === 0) return;
    if (!lensActive) {
      const t = window.setTimeout(() => {
        fitView({ padding: 0.2, duration: 500, maxZoom: 1.2 });
      }, 60);
      return () => window.clearTimeout(t);
    }
    if (!lensMatchIds || lensMatchIds.size === 0) return;
    const matched = nodes.filter(n => lensMatchIds.has(n.id));
    if (matched.length === 0) return;
    const bounds = getNodesBounds(
      matched.map(n => ({ ...n, width: NODE_W, height: NODE_H })),
    );
    const t = window.setTimeout(() => {
      // Mirror the search-select behavior: call setCenter on the cluster's
      // center X, but keep the user's current vertical center and zoom so
      // the row they're inspecting doesn't shift up or down.
      const pane = document.querySelector(".react-flow") as HTMLElement | null;
      const paneRect = pane?.getBoundingClientRect();
      const vp = getViewport();
      const targetCenterFlowX = bounds.x + bounds.width / 2;
      const currentCenterFlowY = paneRect
        ? (paneRect.height / 2 - vp.y) / vp.zoom
        : bounds.y + bounds.height / 2;
      setCenter(targetCenterFlowX, currentCenterFlowY, {
        zoom: vp.zoom,
        duration: 500,
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [lensParam, lensActive, lensMatchIds, nodes, fitView, getViewport, setCenter]);



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

  // Export graph as PDF
  const exportAsPdf = useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      toast.error("Could not find graph viewport");
      return;
    }

    try {
      toast.loading("Generating PDF...", { id: "export-pdf" });

      const nodesBounds = getNodesBounds(nodes);
      const padding = 50;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      const dataUrl = await toPng(viewport, {
        backgroundColor: 'hsl(222.2 84% 4.9%)',
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
      });

      const orientation = width > height ? 'landscape' as const : 'portrait' as const;
      const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save('artifact-graph.pdf');

      toast.success("Graph exported as PDF", { id: "export-pdf" });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF", { id: "export-pdf" });
    }
  }, [nodes]);

  // ── Lineage augmentation ────────────────────────────────────────────────
  // In "lineage" mode we feed the SAME canvas pipeline-run nodes and
  // "generated" edges from useArtifactLineage on top of the artifact graph.
  // One shell, one node language, one layout engine — only the dataset
  // changes when the user flips the tab.
  const { nodes: mergedNodes, edges: mergedEdges } = useMemo(() => {
    if (mode !== "lineage" || !lineageData) {
      return { nodes: initialNodes, edges: initialEdges };
    }

    const artifactIds = new Set(initialNodes.map(n => n.id));
    const extraNodes: Node[] = [];
    const extraEdges: Edge[] = [];

    lineageData.pipelineRuns.forEach((run) => {
      const id = `run-${run.id}`;
      extraNodes.push({
        id,
        type: "artifact",
        position: { x: 0, y: 0 },
        data: {
          label: run.pipeline?.name || "Pipeline run",
          type: "PIPELINE" as const,
          shortId: run.id.slice(0, 8),
          status:
            run.status === "completed" ? "DONE" :
            run.status === "running"   ? "IN_PROGRESS" :
            run.status === "failed"    ? "BLOCKED" : "TODO",
          showOverlays: false,
        },
      });
    });

    lineageData.edges.forEach((e) => {
      const source = e.source; // "run-<id>"
      const target = e.target.startsWith("artifact-") ? e.target.slice("artifact-".length) : e.target;
      if (!artifactIds.has(target)) return;
      extraEdges.push({
        id: `lineage-${e.id}`,
        source,
        target,
        type: "smoothstep",
        animated: false,
        label: e.label,
        labelStyle: { fontSize: 10, fill: "hsl(var(--accent))" },
        labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "hsl(var(--accent))",
        },
        style: { stroke: "hsl(var(--accent))", strokeWidth: 1.25, opacity: 0.7 },
      });
    });

    return {
      nodes: [...extraNodes, ...initialNodes],
      edges: [...initialEdges, ...extraEdges],
    };
  }, [mode, lineageData, initialNodes, initialEdges]);

  // Run Dagre once we have both nodes and edges. Memoized so it only
  // re-runs when the underlying graph actually changes.
  const laidOutNodes = useMemo(
    () => layoutWithDagre(mergedNodes, mergedEdges, "LR"),
    [mergedNodes, mergedEdges],
  );

  // Update nodes first, then edges after a brief delay to ensure nodes are registered
  useEffect(() => {
    setNodes(laidOutNodes);
    const timer = setTimeout(() => {
      setEdges(mergedEdges);
    }, 50);
    return () => clearTimeout(timer);
  }, [laidOutNodes, mergedEdges, setNodes, setEdges]);

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
        <div ref={graphShellRef} className="h-full w-full">
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
              style: {
                stroke: "hsl(var(--accent))",
                strokeWidth: 1.25,
                opacity: 0.55,
              },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="hsl(var(--border))"
            />
            <Controls
              position="bottom-right"
              className="!flex !flex-col !gap-0 !overflow-hidden !rounded-lg !border !border-border !bg-card/90 !shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] !backdrop-blur [&>button]:!h-8 [&>button]:!w-8 [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-border/60 [&>button:last-child]:!border-b-0 [&>button]:!bg-transparent [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!text-foreground [&>button>svg]:!fill-current"
              showInteractive={true}
            />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeColor={(node) => {
                const type = node.data?.type as ArtifactType;
                const colors: Record<ArtifactType, string> = {
                  PRD: "hsl(262 70% 60%)",
                  EPIC: "hsl(222 78% 58%)",
                  STORY: "hsl(173 80% 42%)",
                  ACCEPTANCE_CRITERION: "hsl(152 65% 45%)",
                  TEST_CASE: "hsl(38 92% 52%)",
                  TEST_SUITE: "hsl(25 90% 55%)",
                  CODE_MODULE: "hsl(220 9% 55%)",
                  COMMIT: "hsl(220 9% 50%)",
                  PULL_REQUEST: "hsl(243 75% 62%)",
                  BUG: "hsl(0 72% 55%)",
                  IDEA: "hsl(45 93% 55%)",
                  DECISION: "hsl(189 80% 48%)",
                  RELEASE: "hsl(152 65% 42%)",
                  DEPLOYMENT: "hsl(262 70% 58%)",
                  FILE: "hsl(30 10% 50%)",
                };
                return colors[type] || "hsl(var(--muted-foreground))";
              }}
              nodeStrokeWidth={0}
              nodeBorderRadius={3}
              maskColor="hsl(var(--background) / 0.7)"
              maskStrokeColor="hsl(var(--border))"
              maskStrokeWidth={1}
              style={{ marginBottom: 148 }}
              className="!h-[120px] !w-[180px] !overflow-hidden !rounded-lg !border !border-border !bg-card/90 !shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] !backdrop-blur"
            />


            {/* Header / toolbar panel */}
            <Panel position="top-left" className="!m-4">
              <div className="w-[360px] overflow-hidden rounded-xl border border-border bg-card/90 shadow-[0_12px_32px_-16px_hsl(var(--foreground)/0.22)] backdrop-blur">
                {/* Title row */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/12 text-accent">
                      <GitBranch className="h-3 w-3" />
                    </span>
                    <h2 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                      {mode === "lineage" ? "Pipeline lineage" : "Artifact graph"}
                    </h2>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {nodes.length}n · {edges.length}e
                    </span>
                  </div>
                  <Tabs value={currentView} onValueChange={onViewChange}>
                    <TabsList className="h-6 bg-muted/60 p-0.5">
                      <TabsTrigger value="graph" className="h-5 px-2 text-[10px] font-medium">Graph</TabsTrigger>
                      <TabsTrigger value="lineage" className="h-5 px-2 text-[10px] font-medium">Lineage</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Search */}
                {/* Search moved to ⌘K command palette (see CommandDialog below) */}

                {/* Toolbar — single dense row */}
                <div className="flex flex-wrap items-center gap-1 px-2 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    className="h-7 gap-1.5 px-2 text-[11px] font-medium"
                  >
                    <Search className="h-3 w-3" />
                    Search
                    <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 font-mono text-[9px] text-muted-foreground sm:inline-block">
                      ⌘K
                    </kbd>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImpactAnalysisMode(!impactAnalysisMode);
                      if (impactAnalysisMode) setSelectedNodeId(null);
                    }}
                    className={cn(
                      "h-7 gap-1.5 px-2 text-[11px] font-medium",
                      impactAnalysisMode && "bg-accent/12 text-accent hover:bg-accent/18 hover:text-accent",
                    )}
                  >
                    <GitBranch className="h-3 w-3" />
                    Impact
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] font-medium">
                        <Filter className="h-3 w-3" />
                        Types
                        {artifactTypeFilter.length > 0 && (
                          <span className="ml-0.5 rounded-sm bg-accent/15 px-1 font-mono text-[9px] text-accent">{artifactTypeFilter.length}</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {artifactTypes.map((type) => {
                        const meta = TYPE_META[type.value];
                        const Icon = meta.icon;
                        return (
                          <DropdownMenuCheckboxItem
                            key={type.value}
                            checked={artifactTypeFilter.includes(type.value)}
                            onCheckedChange={(checked) => {
                              if (checked) setArtifactTypeFilter([...artifactTypeFilter, type.value]);
                              else setArtifactTypeFilter(artifactTypeFilter.filter(t => t !== type.value));
                            }}
                          >
                            <Icon className={cn("mr-2 h-3.5 w-3.5 shrink-0", meta.tone)} />
                            {type.label}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] font-medium">
                        <Link2 className="h-3 w-3" />
                        Edges
                        {edgeTypeFilter.length > 0 && (
                          <span className="ml-0.5 rounded-sm bg-accent/15 px-1 font-mono text-[9px] text-accent">{edgeTypeFilter.length}</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {Object.entries(EdgeType).map(([key, value]) => (
                        <DropdownMenuCheckboxItem
                          key={value}
                          checked={edgeTypeFilter.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) setEdgeTypeFilter([...edgeTypeFilter, value]);
                            else setEdgeTypeFilter(edgeTypeFilter.filter(t => t !== value));
                          }}
                        >
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: edgeTypeStyles[value]?.stroke || 'hsl(var(--muted-foreground))' }}
                          />
                          {edgeTypeStyles[value]?.label || key.toLowerCase()}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {edgeTypeFilter.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEdgeTypeFilter([])}>Clear all</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] font-medium">
                        <LayoutGrid className="h-3 w-3" />
                        Layout
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuCheckboxItem checked={graphViewMode === "hierarchy"} onCheckedChange={() => setGraphViewMode("hierarchy")}>Hierarchy</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={graphViewMode === "force"} onCheckedChange={() => setGraphViewMode("force")}>Force-Directed</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={graphViewMode === "radial"} onCheckedChange={() => setGraphViewMode("radial")}>Radial</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOverlays(!showOverlays)}
                    className={cn(
                      "h-7 gap-1.5 px-2 text-[11px] font-medium",
                      showOverlays && "bg-accent/12 text-accent hover:bg-accent/18 hover:text-accent",
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" />
                    Overlays
                  </Button>

                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportAsImage('png')}>
                          <Image className="mr-2 h-3.5 w-3.5" /> Export as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportAsImage('svg')}>
                          <FileCode className="mr-2 h-3.5 w-3.5" /> Export as SVG
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={exportAsPdf}>
                          <Download className="mr-2 h-3.5 w-3.5" /> Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {impactAnalysisMode && !selectedNodeId && (
                  <div className="flex items-center gap-1.5 border-t border-border/60 bg-accent/[0.04] px-3.5 py-2 text-[11px] text-muted-foreground">
                    <MousePointer className="h-3 w-3" />
                    Click a node to see its downstream impact
                  </div>
                )}
              </div>
            </Panel>

            {/* Lens rail — segmented pill */}
            <Panel position="top-center" className="!m-4">
              <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/90 p-1 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] backdrop-blur">
                <span className="px-2.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Lens
                </span>
                <span className="mr-0.5 h-3.5 w-px bg-border" />
                {([
                  { id: "none", label: "All" },
                  { id: "orphans", label: "Orphans" },
                  { id: "coverage-gaps", label: "Coverage gaps" },
                  { id: "drift", label: "Drift" },
                  { id: "recent", label: "Recent" },
                ] as const).map((l) => {
                  const active = lensParam === l.id;
                  const matchCount =
                    l.id === "none" ? null : active ? lensMatchIds?.size ?? 0 : null;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLens(l.id)}
                      className={cn(
                        "flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors",
                        active
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {l.label}
                      {matchCount != null && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 font-mono text-[9px]",
                            active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {matchCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Panel>

            {/* Legend — minimal glass strip */}
            <Panel position="bottom-left" className="!m-4">
              <div className="overflow-hidden rounded-lg border border-border bg-card/90 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] backdrop-blur">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                    Types
                  </span>
                  <div className="flex items-center gap-2.5">
                    {[
                      { tone: "text-violet-500", icon: FileText, label: "PRD" },
                      { tone: "text-blue-500", icon: Layers, label: "Epic" },
                      { tone: "text-accent", icon: Sparkles, label: "Story" },
                      { tone: "text-emerald-500", icon: CheckCircle2, label: "AC" },
                      { tone: "text-amber-500", icon: TestTube2, label: "Test" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-1">
                          <Icon className={cn("h-3 w-3", item.tone)} />
                          <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {showOverlays && (
                  <div className="flex items-center gap-3 border-t border-border/60 px-3 py-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                      Coverage
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-muted-foreground">≥80%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-5 rounded-full bg-amber-500" />
                        <span className="text-[11px] text-muted-foreground">≥50%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-5 rounded-full bg-red-500" />
                        <span className="text-[11px] text-muted-foreground">&lt;50%</span>
                      </div>
                      <span className="mx-1 h-3 w-px bg-border" />
                      <div className="flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                        <span className="text-[11px] text-muted-foreground">Drift</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Impact Analysis Results Panel — editorial glass */}
            {impactAnalysisMode && selectedNodeId && selectedArtifact && (() => {
              const selectedMeta = TYPE_META[selectedArtifact.type] ?? TYPE_META.FILE;
              const SelectedIcon = selectedMeta.icon;
              const renderRow = (artifact: typeof upstreamArtifacts[number]) => {
                const m = TYPE_META[artifact.type] ?? TYPE_META.FILE;
                const I = m.icon;
                return (
                  <button
                    key={artifact.id}
                    onClick={() => focusOnNode(artifact.id)}
                    className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left transition-all hover:border-border/60 hover:bg-muted/60"
                  >
                    <I className={cn("h-3.5 w-3.5 shrink-0", m.tone)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-foreground">{artifact.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>{m.label}</span>
                        <span>·</span>
                        <span className="normal-case">{artifact.short_id}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                );
              };

              return (
                <Panel position="top-right" className="m-4">
                  <div className="w-[340px] overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 ring-1 ring-amber-500/30">
                          <GitBranch className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[12px] font-semibold text-foreground">Impact Analysis</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            {upstreamArtifacts.length} up · {downstreamArtifacts.length} down
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearImpactAnalysis}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Selected anchor */}
                    <div className="border-b border-border/60 bg-muted/30 px-3.5 py-2.5">
                      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        Anchor
                      </div>
                      <div className="flex items-center gap-2">
                        <SelectedIcon className={cn("h-4 w-4 shrink-0", selectedMeta.tone)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-foreground">{selectedArtifact.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span>{selectedMeta.label}</span>
                            <span>·</span>
                            <span className="normal-case">{selectedArtifact.short_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upstream */}
                    <div className="px-2 pb-1 pt-2">
                      <div className="flex items-center justify-between px-1.5 pb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpRight className="h-3 w-3 text-blue-500" />
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            Upstream
                          </span>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {upstreamArtifacts.length}
                        </span>
                      </div>
                      {upstreamArtifacts.length === 0 ? (
                        <p className="px-2 py-2 text-[11px] italic text-muted-foreground/70">No upstream dependencies</p>
                      ) : (
                        <ScrollArea className="max-h-40">
                          <div className="space-y-0.5 pr-1">
                            {upstreamArtifacts.map(renderRow)}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <div className="mx-3 h-px bg-border/50" />

                    {/* Downstream */}
                    <div className="px-2 pb-2 pt-2">
                      <div className="flex items-center justify-between px-1.5 pb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowDownRight className="h-3 w-3 text-amber-500" />
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            Downstream
                          </span>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {downstreamArtifacts.length}
                        </span>
                      </div>
                      {downstreamArtifacts.length === 0 ? (
                        <p className="px-2 py-2 text-[11px] italic text-muted-foreground/70">No downstream impact</p>
                      ) : (
                        <ScrollArea className="max-h-40">
                          <div className="space-y-0.5 pr-1">
                            {downstreamArtifacts.map(renderRow)}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </Panel>
              );
            })()}
          </ReactFlow>

          {/* ⌘K Search palette — portaled, so never clipped by canvas chrome */}
          <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} shouldFilter={false}>
            <CommandInput
              placeholder="Search artifacts by title, ID, or type…"
              value={searchQuery}
              onValueChange={(v) => {
                setSearchQuery(v);
                handleSearch(v);
              }}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery.trim() ? "No artifacts match." : "Start typing to search."}
              </CommandEmpty>
              {searchResults.length > 0 && (
                <CommandGroup heading={`${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}>
                  {searchResults.slice(0, 50).map((artifact) => {
                    const meta = TYPE_META[artifact.type] ?? TYPE_META.FILE;
                    const Icon = meta.icon;
                    return (
                      <CommandItem
                        key={artifact.id}
                        value={artifact.id}
                        keywords={[artifact.title, artifact.short_id, artifact.type]}
                        onSelect={() => selectSearchResult(artifact)}
                        onClick={() => selectSearchResult(artifact)}
                        className="gap-2.5 !cursor-pointer"
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", meta.tone)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{artifact.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-accent-foreground group-data-[selected=true]:text-accent-foreground">
                            <span className="uppercase tracking-wider">{meta.label}</span>
                            <span>·</span>
                            <span>{artifact.short_id}</span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </CommandDialog>

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

// ─────────────────────────────────────────────────────────────────────────────
// /graph router
//
// The page is organized around saved questions (see src/lib/graphQuestions.ts).
// No ?q= → Graph Home (insights + question grid + artifact picker).
// ?q=full-map → the original full-project React Flow canvas (kept verbatim).
// ?q=<anything else> → a focused question view.
//
// `view=lineage` (legacy deep-link) is preserved and routes to the
// pipeline-lineage component as before.
// ─────────────────────────────────────────────────────────────────────────────

import { GraphHome } from "@/components/graph/GraphHome";
import { GraphFocusedShell } from "@/components/graph/GraphFocusedShell";
import { OrphansView } from "@/components/graph/questions/OrphansView";
import { CoverageGapsView } from "@/components/graph/questions/CoverageGapsView";
import { DriftView } from "@/components/graph/questions/DriftView";
import { RecentlyChangedView } from "@/components/graph/questions/RecentlyChangedView";
import { LineageWalkView } from "@/components/graph/questions/LineageWalkView";
import {
  isGraphQuestionId,
  QUESTION_BY_ID,
  type GraphQuestionId,
} from "@/lib/graphQuestions";

const GraphPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const qParam = searchParams.get("q");

  const handleViewChange = (value: string) => {
    if (value === "lineage") setSearchParams({ view: "lineage" });
    else setSearchParams({});
  };

  // Focused list answers (orphans, drift, etc.) — still reachable via ?q=
  // The canvas is the default page; lenses ride on top of it via ?lens=...
  if (qParam && qParam !== "full-map" && isGraphQuestionId(qParam)) {
    return <QuestionRouter questionId={qParam} />;
  }

  const currentView: "graph" | "lineage" = view === "lineage" ? "lineage" : "graph";

  return (
    <ReactFlowProvider>
      <GraphPageInner onViewChange={handleViewChange} currentView={currentView} />
    </ReactFlowProvider>
  );
};

function QuestionRouter({ questionId }: { questionId: GraphQuestionId }) {
  switch (questionId) {
    case "orphans":
      return <OrphansView />;
    case "coverage-gaps":
      return <CoverageGapsView />;
    case "drift":
      return <DriftView />;
    case "recent":
      return <RecentlyChangedView />;
    case "trace":
      return <LineageWalkView questionId="trace" />;
    case "blast-radius":
      return <LineageWalkView questionId="blast-radius" />;
    case "full-map":
      // handled above with ReactFlowProvider
      return null;
    default: {
      const q = QUESTION_BY_ID[questionId];
      return (
        <GraphFocusedShell question={q}>
          <div className="px-6 py-12 text-center text-[12px] text-muted-foreground">
            This question is coming next.
          </div>
        </GraphFocusedShell>
      );
    }
  }
}


export default GraphPage;
