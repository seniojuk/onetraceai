import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Animated welcome overlay that fires the first time a user lands on the
 * graph after onboarding. Reads `?welcome=1`, plays the reveal, then offers
 * a single CTA back into the product. Self-removes on dismiss.
 */
export function GraphMomentOverlay() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isWelcome = params.get("welcome") === "1";
  const [open, setOpen] = useState(isWelcome);

  useEffect(() => {
    setOpen(isWelcome);
  }, [isWelcome]);

  if (!open) return null;

  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete("welcome");
    setParams(next, { replace: true });
    setOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-6">
      {/* Soft backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-background/60 backdrop-blur-[2px] animate-fade-in pointer-events-auto"
        onClick={dismiss}
      />
      <div className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-rise-in">
        <button
          aria-label="Dismiss"
          onClick={dismiss}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Mini animated graph */}
        <MiniGraph />

        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Your first trace
            </span>
          </div>
          <h3 className="mt-2 font-display text-[24px] font-semibold leading-tight text-foreground">
            This is your Artifact Graph.
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            A live map of what your team is building and why. It updates as you add requirements, link
            GitHub commits, and run tests.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Explore the graph
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="animate-eye-pull"
              onClick={() => {
                dismiss();
                navigate("/artifacts/new?type=STORY");
              }}
            >
              Generate Stories
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniGraph() {
  // SVG mini-graph: PRD → 3 Epics → 3 ACs, drawn in sequence.
  return (
    <div className="relative h-40 w-full bg-gradient-to-b from-muted/30 to-transparent">
      <svg viewBox="0 0 360 160" className="absolute inset-0 h-full w-full">
        {/* Edges */}
        {[
          { d: "M 80 80 C 130 80, 130 36, 200 36", delay: 420 },
          { d: "M 80 80 C 130 80, 130 80, 200 80", delay: 540 },
          { d: "M 80 80 C 130 80, 130 124, 200 124", delay: 660 },
          { d: "M 240 36 C 270 36, 270 36, 310 36", delay: 900 },
          { d: "M 240 80 C 270 80, 270 80, 310 80", delay: 1020 },
          { d: "M 240 124 C 270 124, 270 124, 310 124", delay: 1140 },
        ].map((e, i) => (
          <path
            key={i}
            d={e.d}
            fill="none"
            stroke="hsl(var(--accent) / 0.5)"
            strokeWidth="1.25"
            strokeDasharray="120"
            className="animate-edge-draw"
            style={{ animationDelay: `${e.delay}ms` }}
          />
        ))}

        {/* PRD root */}
        <NodeDot cx={70} cy={80} color="status-prd" delay={120} label="PRD" labelX={70} labelY={104} />

        {/* Epics */}
        <NodeDot cx={220} cy={36} color="status-epic" delay={420} />
        <NodeDot cx={220} cy={80} color="status-epic" delay={540} />
        <NodeDot cx={220} cy={124} color="status-epic" delay={660} />

        {/* ACs */}
        <NodeDot cx={325} cy={36} color="status-ac" delay={900} />
        <NodeDot cx={325} cy={80} color="status-ac" delay={1020} />
        <NodeDot cx={325} cy={124} color="status-ac" delay={1140} />
      </svg>
    </div>
  );
}

function NodeDot({
  cx,
  cy,
  color,
  delay,
  label,
  labelX,
  labelY,
}: {
  cx: number;
  cy: number;
  color: string;
  delay: number;
  label?: string;
  labelX?: number;
  labelY?: number;
}) {
  return (
    <g
      className={cn("animate-node-pop")}
      style={{ animationDelay: `${delay}ms`, transformBox: "fill-box", transformOrigin: "center" }}
    >
      <circle cx={cx} cy={cy} r={11} fill={`hsl(var(--${color}) / 0.15)`} />
      <circle cx={cx} cy={cy} r={5} fill={`hsl(var(--${color}))`} />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
