import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Sparkles } from "lucide-react";

/**
 * 404 — "Off the graph"
 * Hidden easter egg: connect the 4 trace-nodes in order. Reward: a burst of
 * sparks + a one-of-a-kind "Trace Restorer" badge.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [next, setNext] = useState(1);
  const [solved, setSolved] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    console.error("404: route not in graph →", location.pathname);
  }, [location.pathname]);

  const nodes = useMemo(
    () =>
      [1, 2, 3, 4].map((n, i) => ({
        n,
        x: [12, 72, 26, 84][i],
        y: [20, 28, 76, 70][i],
      })),
    []
  );

  const handleClick = (n: number) => {
    if (solved) return;
    if (n === next) {
      if (next === 4) {
        setSolved(true);
        setBurst(true);
        setTimeout(() => setBurst(false), 1400);
      }
      setNext(next + 1);
    } else {
      setNext(1);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--graph-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--graph-grid)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* trace connections */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {nodes.slice(0, Math.max(0, next - 1)).map((_, i) => {
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

      {/* hidden trace-nodes (no instructions) */}
      <div aria-hidden className="absolute inset-0 hidden sm:block">
        {nodes.map((node) => {
          const done = node.n < next || solved;
          return (
            <button
              key={node.n}
              onClick={() => handleClick(node.n)}
              tabIndex={-1}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className={[
                "absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full",
                "transition-all duration-300 outline-none",
                done
                  ? "bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.6)] scale-125"
                  : "bg-foreground/15 hover:bg-foreground/40",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* reward burst */}
      {burst && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-accent animate-in fade-in zoom-in duration-1000"
              style={{
                transform: `rotate(${i * 26}deg) translateY(-${60 + (i % 3) * 24}px)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-[44px] sm:text-[64px] leading-[1.05] font-semibold tracking-tight text-foreground">
          You've wandered off
          <br />
          the graph.
        </h1>

        <p className="mt-5 max-w-sm text-[15px] text-muted-foreground">
          We couldn't find this page.
        </p>

        <div className="mt-7 flex w-full flex-col sm:flex-row sm:w-auto items-stretch sm:items-center justify-center gap-2">
          <Button variant="accent" onClick={() => navigate("/dashboard")}>
            <Home className="mr-1.5 h-4 w-4" aria-hidden />
            Back to dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            Go back
          </Button>
        </div>

        {solved && (
          <div
            role="status"
            aria-live="polite"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent animate-in fade-in slide-in-from-bottom-2 duration-700"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="font-medium">Trace Restorer</span>
            <span className="text-accent/70">— badge unlocked</span>
          </div>
        )}
      </div>
    </main>
  );
};

export default NotFound;
