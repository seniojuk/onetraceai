import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, Bug } from "lucide-react";

interface ErrorPageProps {
  error?: Error;
  onReset?: () => void;
}

/**
 * Generic error page — "broken link in the chain".
 * Hidden easter egg: tap the three faint links. Reward: confetti + a
 * flattering rarity message.
 */
const ErrorPage = ({ error, onReset }: ErrorPageProps) => {
  const navigate = useNavigate();
  const [snapped, setSnapped] = useState(0);
  const total = 3;
  const solved = snapped >= total;
  const rarity = useMemo(() => 150 + Math.floor(Math.random() * 200), []);

  const handleReset = () => {
    onReset?.();
    navigate(0);
  };

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

  const handleSnap = () => {
    if (solved) return;
    const nextVal = snapped + 1;
    setSnapped(nextVal);
    if (nextVal === total) fire();
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

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        {solved ? (
          <>
            <h1 className="mt-4 font-display font-semibold tracking-tight text-foreground text-[38px] leading-[1.05] sm:text-[56px] md:text-[64px] animate-fade-in">
              Amazing.
            </h1>
            <p className="mt-4 max-w-xs sm:max-w-md text-[15px] sm:text-base text-muted-foreground animate-fade-in">
              Only <span className="font-semibold text-foreground">1 in {rarity}</span> people
              ever re-link this chain.
            </p>
            <p className="mt-1 max-w-xs sm:max-w-md text-[15px] text-muted-foreground animate-fade-in">
              Now let's get you back on track.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display font-semibold tracking-tight text-foreground text-[38px] leading-[1.05] sm:text-[56px] md:text-[64px]">
              Something
              <br />
              slipped a link.
            </h1>
            <p className="mt-5 max-w-xs sm:max-w-sm text-[15px] text-muted-foreground">
              Don't worry — your work is safe.
            </p>
          </>
        )}

        {!solved && (
          <div
            aria-hidden
            className="pointer-events-auto mt-8 flex items-center gap-3"
          >
            {Array.from({ length: total }).map((_, i) => {
              const fixed = i < snapped;
              return (
                <button
                  key={i}
                  onClick={handleSnap}
                  tabIndex={-1}
                  className="grid h-11 w-12 place-items-center outline-none"
                >
                  <span
                    className={[
                      "block rounded-full transition-all duration-300",
                      fixed
                        ? "h-1.5 w-10 bg-accent shadow-[0_0_16px_hsl(var(--accent)/0.45)]"
                        : "h-1.5 w-8 bg-foreground/15",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="pointer-events-auto mt-7 flex w-full flex-col sm:flex-row sm:w-auto items-stretch sm:items-center justify-center gap-2">
          <Button variant="accent" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
            Try again
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <Home className="mr-1.5 h-4 w-4" aria-hidden />
            Back to dashboard
          </Button>
        </div>

        {error?.message && (
          <details className="pointer-events-auto mt-8 w-full max-w-md text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground/80 font-mono inline-flex items-center gap-1.5 hover:text-foreground rounded">
              <Bug className="h-3 w-3" aria-hidden />
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
};

export default ErrorPage;
