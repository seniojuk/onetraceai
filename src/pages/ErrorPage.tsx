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
 * Easter egg: click the broken chain pieces to snap them back together.
 */
const ErrorPage = ({ error, onReset }: ErrorPageProps) => {
  const navigate = useNavigate();
  const [snapped, setSnapped] = useState(0);
  const total = 3;
  const solved = snapped >= total;

  const handleReset = () => {
    onReset?.();
    navigate(0);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--graph-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--graph-grid)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-drift" />
          unexpected error · the chain broke
        </div>

        <h1 className="font-display text-[64px] leading-none font-semibold tracking-tight text-foreground">
          Something
          <br />
          slipped a link.
        </h1>

        <p className="mt-5 max-w-md text-[15px] text-muted-foreground">
          A piece of the trace failed unexpectedly. You haven't lost any work —
          let's snap things back together.
        </p>

        {/* easter egg — clickable broken chain */}
        <div className="mt-8 flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => {
            const fixed = i < snapped || solved;
            return (
              <button
                key={i}
                onClick={() => !solved && setSnapped((s) => Math.min(total, s + 1))}
                className={[
                  "h-7 w-10 rounded-md border-2 transition-all duration-300",
                  fixed
                    ? "border-accent bg-accent/15 shadow-[0_0_16px_hsl(var(--accent)/0.35)]"
                    : "border-dashed border-border bg-card hover:border-foreground/40 hover:rotate-3",
                ].join(" ")}
                aria-label={fixed ? "linked" : "broken link"}
              />
            );
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button variant="accent" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Try again
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <Home className="mr-1.5 h-4 w-4" />
            Back to dashboard
          </Button>
        </div>

        {error?.message && (
          <details className="mt-8 w-full max-w-md text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground/80 font-mono inline-flex items-center gap-1.5 hover:text-foreground">
              <Bug className="h-3 w-3" />
              technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        <div className="mt-8 text-xs text-muted-foreground/70 font-mono">
          {solved ? (
            <span className="inline-flex items-center gap-1.5 text-accent animate-in fade-in slide-in-from-bottom-1 duration-500">
              <Sparkles className="h-3 w-3" />
              chain restored · nicely done
            </span>
          ) : (
            <>psst — click the broken links to put them back together</>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
