import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

/**
 * 404 — "Off the graph"
 * Hidden easter egg: tap the 4 faint trace-nodes in order. Reward: confetti
 * + a flattering "1 in 312 people find this trace" message.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [next, setNext] = useState(1);
  const [solved, setSolved] = useState(false);

  // Lock a "rarity" number per mount so it feels real, not random each render
  const rarity = useMemo(() => 200 + Math.floor(Math.random() * 250), []);

  useEffect(() => {
    console.error("404: route not in graph →", location.pathname);
  }, [location.pathname]);

  const nodes = useMemo(
    () => [
      { n: 1, x: 8, y: 12 },
      { n: 2, x: 92, y: 18 },
      { n: 3, x: 10, y: 88 },
      { n: 4, x: 90, y: 82 },
    ],
    []
  );

  const fire = useCallback(() => {
    const teal = "#14b8a6";
    const ink = "#0a0a0a";
    const cream = "#FAFAF7";
    const opts = {
      particleCount: 70,
      spread: 75,
      startVelocity: 45,
      ticks: 220,
      gravity: 0.9,
      scalar: 0.9,
      colors: [teal, ink, cream, "#5eead4"],
      disableForReducedMotion: true,
    };
    confetti({ ...opts, origin: { x: 0.15, y: 0.7 }, angle: 60 });
    confetti({ ...opts, origin: { x: 0.85, y: 0.7 }, angle: 120 });
    setTimeout(
      () =>
        confetti({
          ...opts,
          particleCount: 50,
          origin: { x: 0.5, y: 0.4 },
          spread: 110,
        }),
      180
    );
  }, []);

  const handleClick = (n: number) => {
    if (solved) return;
    if (n === next) {
      if (next === 4) {
        setSolved(true);
        fire();
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

      <div aria-hidden className="absolute inset-0">
        {nodes.map((node) => {
          const done = node.n < next || solved;
          return (
            <button
              key={node.n}
              onClick={() => handleClick(node.n)}
              tabIndex={-1}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center outline-none"
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

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        {solved ? (
          <>
            <h1 className="mt-4 font-display font-semibold tracking-tight text-foreground text-[38px] leading-[1.05] sm:text-[56px] md:text-[64px] animate-fade-in">
              Amazing.
            </h1>
            <p className="mt-4 max-w-xs sm:max-w-md text-[15px] sm:text-base text-muted-foreground animate-fade-in">
              Only <span className="font-semibold text-foreground">1 in {rarity}</span> people
              ever find this trace.
            </p>
            <p className="mt-1 max-w-xs sm:max-w-md text-[15px] text-muted-foreground animate-fade-in">
              Now let's get you somewhere useful.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display font-semibold tracking-tight text-foreground text-[38px] leading-[1.05] sm:text-[56px] md:text-[64px]">
              You've wandered off
              <br />
              the graph.
            </h1>
            <p className="mt-5 max-w-xs sm:max-w-sm text-[15px] text-muted-foreground">
              We couldn't find this page.
            </p>
          </>
        )}

        <div className="pointer-events-auto mt-7 flex w-full flex-col sm:flex-row sm:w-auto items-stretch sm:items-center justify-center gap-2">
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
