import {
  AlertTriangle,
  Activity,
  Clock,
  GitBranch,
  Network,
  Route,
  ScanSearch,
  Unlink,
  LucideIcon,
} from "lucide-react";

/**
 * The Graph page is organized around *questions*, not around a canvas.
 * Each saved question is a tuned answer to something a PM/EM/IC actually
 * walks in trying to find. The full-project canvas is one question among
 * many, not the default.
 */
export type GraphQuestionId =
  | "orphans"
  | "coverage-gaps"
  | "drift"
  | "recent"
  | "trace"
  | "blast-radius"
  | "full-map";

export type GraphQuestionTone = "warning" | "destructive" | "accent" | "muted";

export type GraphQuestionKind = "list" | "focus-on-artifact" | "canvas";

export interface GraphQuestion {
  id: GraphQuestionId;
  label: string;
  /** One-liner shown on the home card. Plain language, user nouns. */
  blurb: string;
  /** Verb the user reads as the heading inside the focused view. */
  focusedHeading: string;
  icon: LucideIcon;
  tone: GraphQuestionTone;
  kind: GraphQuestionKind;
  /** If true, the question needs an artifact picked first. */
  requiresArtifact?: boolean;
}

export const GRAPH_QUESTIONS: GraphQuestion[] = [
  {
    id: "orphans",
    label: "Orphan stories",
    blurb: "Stories not linked to any epic, PRD, code, or tests.",
    focusedHeading: "Orphan artifacts",
    icon: Unlink,
    tone: "warning",
    kind: "list",
  },
  {
    id: "coverage-gaps",
    label: "Coverage gaps",
    blurb: "Artifacts with the thinnest test coverage — sorted ascending.",
    focusedHeading: "Coverage gaps",
    icon: Activity,
    tone: "destructive",
    kind: "list",
  },
  {
    id: "drift",
    label: "Drift hotspots",
    blurb: "Open drift findings between spec and code, by severity.",
    focusedHeading: "Drift hotspots",
    icon: AlertTriangle,
    tone: "destructive",
    kind: "list",
  },
  {
    id: "recent",
    label: "Recently changed",
    blurb: "What moved in the last 14 days — quick eyes-on for review.",
    focusedHeading: "Recently changed",
    icon: Clock,
    tone: "accent",
    kind: "list",
  },
  {
    id: "trace",
    label: "Trace PRD → code",
    blurb: "Pick a requirement; walk the full lineage to merged code.",
    focusedHeading: "Trace lineage",
    icon: Route,
    tone: "accent",
    kind: "focus-on-artifact",
    requiresArtifact: true,
  },
  {
    id: "blast-radius",
    label: "Blast radius",
    blurb: "Pick an artifact; show every downstream artifact it touches.",
    focusedHeading: "Blast radius",
    icon: ScanSearch,
    tone: "accent",
    kind: "focus-on-artifact",
    requiresArtifact: true,
  },
  {
    id: "full-map",
    label: "Full project map",
    blurb: "The whole graph. Best for orientation; rarely the answer.",
    focusedHeading: "Full project map",
    icon: Network,
    tone: "muted",
    kind: "canvas",
  },
];

export const QUESTION_BY_ID: Record<GraphQuestionId, GraphQuestion> =
  Object.fromEntries(GRAPH_QUESTIONS.map((q) => [q.id, q])) as Record<
    GraphQuestionId,
    GraphQuestion
  >;

export function isGraphQuestionId(value: string | null): value is GraphQuestionId {
  if (!value) return false;
  return value in QUESTION_BY_ID;
}

/** Tailwind token classes tied to the locked design system. */
export const TONE_CLASSES: Record<
  GraphQuestionTone,
  { icon: string; chip: string; ring: string }
> = {
  warning: {
    icon: "text-warning",
    chip: "bg-warning/10 text-warning border-warning/20",
    ring: "group-hover:border-warning/40",
  },
  destructive: {
    icon: "text-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
    ring: "group-hover:border-destructive/40",
  },
  accent: {
    icon: "text-accent",
    chip: "bg-accent/10 text-accent border-accent/20",
    ring: "group-hover:border-accent/40",
  },
  muted: {
    icon: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border",
    ring: "group-hover:border-foreground/20",
  },
};

// Re-export so callers can also pull the GitBranch icon for breadcrumb if needed
export { GitBranch };
