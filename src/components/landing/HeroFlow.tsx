import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FileText,
  Layers,
  GitBranch,
  CheckCircle2,
  TestTube2,
  Sparkles,
} from "lucide-react";

type Kind = "prd" | "epic" | "story" | "pr" | "test" | "jira";

type FlowNodeData = {
  kind: Kind;
  id: string;
  title: string;
  meta: string;
  status?: "done" | "active" | "open";
};

const KIND_META: Record<
  Kind,
  { icon: typeof FileText; label: string; tone: string }
> = {
  prd: { icon: FileText, label: "PRD", tone: "text-violet-500" },
  epic: { icon: Layers, label: "EPIC", tone: "text-blue-500" },
  story: { icon: Sparkles, label: "STORY", tone: "text-accent" },
  jira: { icon: GitBranch, label: "JIRA", tone: "text-sky-500" },
  pr: { icon: GitBranch, label: "PR", tone: "text-emerald-500" },
  test: { icon: TestTube2, label: "TEST", tone: "text-amber-500" },
};

function ArtifactNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const meta = KIND_META[data.kind];
  const Icon = meta.icon;
  const isStory = data.kind === "story";

  return (
    <div
      className={`group relative w-[180px] rounded-lg border bg-card px-3 py-2.5 shadow-sm transition ${
        isStory
          ? "border-accent/50 shadow-[0_0_0_3px_hsl(var(--accent)/0.10)]"
          : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-border"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3 w-3 ${meta.tone}`} />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {meta.label}
          </span>
        </div>
        {data.status === "done" && (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        )}
        {data.status === "active" && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        )}
      </div>
      <div className="mt-1.5 truncate text-[12px] font-medium tracking-tight text-foreground">
        {data.title}
      </div>
      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
        {data.id} · {data.meta}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !border-0 !bg-border"
      />
    </div>
  );
}

const nodeTypes = { artifact: ArtifactNode };

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: "prd",
    type: "artifact",
    position: { x: 200, y: 0 },
    data: { kind: "prd", id: "PRD-042", title: "User authentication", meta: "4 ACs", status: "done" },
  },
  {
    id: "epic",
    type: "artifact",
    position: { x: 200, y: 110 },
    data: { kind: "epic", id: "EPIC-014", title: "Onboarding v2", meta: "3 stories", status: "active" },
  },
  {
    id: "story-1",
    type: "artifact",
    position: { x: 0, y: 230 },
    data: { kind: "story", id: "STORY-217", title: "Google OAuth flow", meta: "in progress", status: "active" },
  },
  {
    id: "story-2",
    type: "artifact",
    position: { x: 400, y: 230 },
    data: { kind: "story", id: "STORY-218", title: "Email magic link", meta: "in review", status: "active" },
  },
  {
    id: "jira",
    type: "artifact",
    position: { x: 0, y: 360 },
    data: { kind: "jira", id: "OT-1284", title: "Implement OAuth", meta: "in progress", status: "active" },
  },
  {
    id: "pr",
    type: "artifact",
    position: { x: 220, y: 360 },
    data: { kind: "pr", id: "#482", title: "feat(auth): handler", meta: "merged", status: "done" },
  },
  {
    id: "test",
    type: "artifact",
    position: { x: 440, y: 360 },
    data: { kind: "test", id: "TEST-091", title: "OAuth callback spec", meta: "3/3 passing", status: "done" },
  },
];

const edgeBase = {
  type: "smoothstep" as const,
  animated: true,
  style: { stroke: "hsl(var(--accent))", strokeWidth: 1.2, opacity: 0.55 },
};

const initialEdges: Edge[] = [
  { id: "e1", source: "prd", target: "epic", ...edgeBase },
  { id: "e2", source: "epic", target: "story-1", ...edgeBase },
  { id: "e3", source: "epic", target: "story-2", ...edgeBase },
  { id: "e4", source: "story-1", target: "jira", ...edgeBase },
  { id: "e5", source: "story-1", target: "pr", ...edgeBase },
  { id: "e6", source: "story-2", target: "pr", ...edgeBase },
  { id: "e7", source: "story-1", target: "test", ...edgeBase },
  { id: "e8", source: "story-2", target: "test", ...edgeBase },
];

export function HeroFlow() {
  const nodes = useMemo(() => initialNodes, []);
  const edges = useMemo(() => initialEdges, []);

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_hsl(var(--foreground)/0.18)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            artifact-graph / onboarding-v2
          </span>
        </div>
        <span className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          live
        </span>
      </div>

      <div className="relative h-[calc(100%-41px)] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="hsl(var(--border))"
          />
        </ReactFlow>
        {/* Soft top vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,transparent,hsl(var(--card)/0.6))]"
        />
      </div>
    </div>
  );
}

export default HeroFlow;
