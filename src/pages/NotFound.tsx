import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

/**
 * 404 — "Off the graph"
 * Hidden easter egg: tap the 4 faint trace-nodes in order.
 * Reward: a full-screen accent ripple + the headline briefly morphs.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [next, setNext] = useState(1);
  const [solved, setSolved] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    console.error("404: route not in graph →", location.pathname);
  }, [location.pathname]);

  // Positions tuned to stay clear of the centered text on all viewports
  const nodes = useMemo(
    () => [
      { n: 1, x: 8, y: 12 },
      { n: 2, x: 92, y: 18 },
      { n: 3, x: 10, y: 88 },
      { n: 4, x: 90, y: 82 },
    ],
    []
  );

  const handleClick = (n: number) => {
    if (solved) return;
    if (n === next) {
      if (next === 4) {
        setSolved(true);
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 2200);
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
              className="animate-fade-in"
            />
          );
        })}
      </svg>

      {/* trace-nodes — visible on every viewport, larger tap target on mobile */}
      <div aria-hidden className="absolute inset-0">
        {nodes.map((node) => {
          const done = node.n < next || solved;
          return (
            <button
              key={node.n}
              onClick={() => handleClick(node.n)}
              tabIndex={-1}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className={[
                "absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center",
                "h-11 w-11 rounded-full transition-all duration-300 outline-none",
              ].join(" ")}
            >
              <span
                className={[
                  "block rounded-full transition-all duration-300",
                  done
                    ? "h-3.5 w-3.5 bg-accent shadow-[0_0_24px_hsl(var(--accent)/0.7)] scale-110"
                    : "h-2.5 w-2.5 bg-foreground/20",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      {/* reward ripple */}
      {celebrating && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <span
            className="block h-32 w-32 rounded-full border-2 border-accent/60 animate-[ripple_1.8s_ease-out_forwards]"
            style={{
              animation:
                "ripple 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
          <style>{`@keyframes ripple {
            0% { transform: scale(0.2); opacity: 0.9; }
            100% { transform: scale(28); opacity: 0; }
          }`}</style>
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1
          className={[
            "font-display font-semibold tracking-tight text-foreground",
            "text-[38px] leading-[1.05] sm:text-[56px] md:text-[64px]",
            "transition-colors duration-500",
            celebrating && "text-accent",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-live="polite"
        >
          {solved ? (
            <>
              Nicely done.
              <br />
              <span className="text-foreground/80">Trace restored.</span>
            </>
          ) : (
            <>
              You've wandered off
              <br />
              the graph.
            </>
          )}
        </h1>

        <p className="mt-5 max-w-xs sm:max-w-sm text-[15px] text-muted-foreground">
          {solved ? "Now let's get you somewhere useful." : "We couldn't find this page."}
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
      </div>
    </main>
  );
};

export default NotFound;
