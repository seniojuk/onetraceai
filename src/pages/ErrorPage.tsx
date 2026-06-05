import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, Bug } from "lucide-react";

interface ErrorPageProps {
  error?: Error;
  onReset?: () => void;
}

/**
 * Generic error page — "broken link in the chain".
 * Hidden easter egg: tap the three faint dashes to re-link the chain.
 * Reward: a full-screen accent ripple + the headline briefly morphs.
 */
const ErrorPage = ({ error, onReset }: ErrorPageProps) => {
  const navigate = useNavigate();
  const [snapped, setSnapped] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const total = 3;
  const solved = snapped >= total;

  const handleReset = () => {
    onReset?.();
    navigate(0);
  };

  const handleSnap = () => {
    if (solved) return;
    const nextVal = snapped + 1;
    setSnapped(nextVal);
    if (nextVal === total) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2200);
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

      {celebrating && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <span
            className="block h-32 w-32 rounded-full border-2 border-accent/60"
            style={{
              animation: "ripple 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
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
              <span className="text-foreground/80">Chain re-linked.</span>
            </>
          ) : (
            <>
              Something
              <br />
              slipped a link.
            </>
          )}
        </h1>

        <p className="mt-5 max-w-xs sm:max-w-sm text-[15px] text-muted-foreground">
          {solved ? "Now let's get you back on track." : "Don't worry — your work is safe."}
        </p>

        {/* faint chain — visible on every viewport, larger tap target on mobile */}
        <div aria-hidden className="mt-8 flex items-center gap-3">
          {Array.from({ length: total }).map((_, i) => {
            const fixed = i < snapped || solved;
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

        <div className="mt-7 flex w-full flex-col sm:flex-row sm:w-auto items-stretch sm:items-center justify-center gap-2">
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
          <details className="mt-8 w-full max-w-md text-left">
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
