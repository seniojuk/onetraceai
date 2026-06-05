import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, Bug, Sparkles } from "lucide-react";

interface ErrorPageProps {
  error?: Error;
  onReset?: () => void;
}

/**
 * Generic error page — "broken link in the chain".
 * Hidden easter egg: click the three faint dashes to re-link the chain.
 * Reward: a soft pulse + "Chain Mender" badge.
 */
const ErrorPage = ({ error, onReset }: ErrorPageProps) => {
  const navigate = useNavigate();
  const [snapped, setSnapped] = useState(0);
  const [burst, setBurst] = useState(false);
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
      setBurst(true);
      setTimeout(() => setBurst(false), 1400);
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
          Something
          <br />
          slipped a link.
        </h1>

        <p className="mt-5 max-w-sm text-[15px] text-muted-foreground">
          Don't worry — your work is safe.
        </p>

        {/* faint chain — no instructions */}
        <div aria-hidden className="mt-8 hidden sm:flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => {
            const fixed = i < snapped || solved;
            return (
              <button
                key={i}
                onClick={handleSnap}
                tabIndex={-1}
                className={[
                  "h-1.5 w-8 rounded-full transition-all duration-300",
                  fixed
                    ? "bg-accent shadow-[0_0_16px_hsl(var(--accent)/0.45)] scale-110"
                    : "bg-foreground/10 hover:bg-foreground/30",
                ].join(" ")}
              />
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
            <summary className="cursor-pointer text-xs text-muted-foreground/80 font-mono inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <Bug className="h-3 w-3" aria-hidden />
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        {solved && (
          <div
            role="status"
            aria-live="polite"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent animate-in fade-in slide-in-from-bottom-2 duration-700"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="font-medium">Chain Mender</span>
            <span className="text-accent/70">— badge unlocked</span>
          </div>
        )}
      </div>
    </main>
  );
};

export default ErrorPage;
