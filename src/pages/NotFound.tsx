import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search, Sparkles } from "lucide-react";

/**
 * 404 — "Off the graph"
 * Easter egg: connect the 4 floating trace-nodes in order (1→2→3→4)
 * to restore the lineage. Reward = a tiny celebration line.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [next, setNext] = useState(1);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    console.error("404: route not in graph →", location.pathname);
  }, [location.pathname]);

  // Stable random-ish positions per mount
  const nodes = useMemo(
    () =>
      [1, 2, 3, 4].map((n, i) => ({
        n,
        x: [14, 70, 30, 84][i],
        y: [22, 30, 74, 68][i],
      })),
    []
  );

  const handleClick = (n: number) => {
    if (solved) return;
    if (n === next) {
      if (next === 4) setSolved(true);
      setNext(next + 1);
    } else {
      setNext(1);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* faint graph grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--graph-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--graph-grid)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* easter-egg trace nodes */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        {nodes.slice(0, Math.max(0, next - 1)).map((node, i) => {
          const a = nodes[i];
          const b = nodes[i + 1];
          if (!b) return null;
          return (
            <line
              key={i}
              x1={`${a.x}%`}
              y1={`${a.y}%`}
              x2={`${b.x}%`}
              y2={`${b.y}%`}
              stroke="hsl(var(--accent))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="animate-in fade-in duration-500"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const done = node.n < next || solved;
        const isNext = node.n === next && !solved;
        return (
          <button
            key={node.n}
            onClick={() => handleClick(node.n)}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className={[
              "absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center",
              "h-9 w-9 rounded-full border text-xs font-medium font-mono",
              "transition-all duration-300",
              done
                ? "bg-accent text-accent-foreground border-accent shadow-[0_0_24px_hsl(var(--accent)/0.45)]"
                : isNext
                  ? "bg-card text-foreground border-accent animate-pulse"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/40",
            ].join(" ")}
            aria-label={`trace node ${node.n}`}
          >
            {node.n}
          </button>
        );
      })}

      {/* main content card */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          404 · off the graph
        </div>

        <h1 className="font-display text-[64px] leading-none font-semibold tracking-tight text-foreground">
          This trace
          <br />
          leads nowhere.
        </h1>

        <p className="mt-5 max-w-md text-[15px] text-muted-foreground">
          We couldn't find{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {location.pathname}
          </code>{" "}
          in your workspace lineage. Let's get you back on a known path.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button variant="accent" onClick={() => navigate("/dashboard")}>
            <Home className="mr-1.5 h-4 w-4" />
            Back to dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Go back
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/artifacts">
              <Search className="mr-1.5 h-4 w-4" />
              Browse artifacts
            </Link>
          </Button>
        </div>

        <div className="mt-10 text-xs text-muted-foreground/70 font-mono">
          {solved ? (
            <span className="inline-flex items-center gap-1.5 text-accent animate-in fade-in slide-in-from-bottom-1 duration-500">
              <Sparkles className="h-3 w-3" />
              trace restored · you found the easter egg
            </span>
          ) : (
            <>psst — connect the nodes 1 → 2 → 3 → 4 to restore the trace</>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
