import { Sparkles, PenLine, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChoosePathStepProps {
  onDemo: () => void;
  onReal: () => void;
  isLoading?: boolean;
  loadingPath?: "demo" | "real" | null;
}

export function ChoosePathStep({ onDemo, onReal, isLoading, loadingPath }: ChoosePathStepProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="animate-rise-in">
        <h1 className="font-display text-[36px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[48px]">
          Pick how you want to start.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
          Try the product on a pre-built sample, or wire up your real project now. You can always do both later.
        </p>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 md:grid-cols-2">
        <PathCard
          icon={Sparkles}
          accentClass="bg-status-prd/10 text-status-prd-fg"
          eyebrow="60 seconds"
          title="Show me what OneTrace can do"
          body="Load a pre-built demo project. You see a fully populated graph with PRD, Epics, Stories, and tests immediately."
          cta="Load demo project"
          loading={isLoading && loadingPath === "demo"}
          disabled={isLoading}
          onClick={onDemo}
          highlight
        />
        <PathCard
          icon={PenLine}
          accentClass="bg-status-epic/10 text-status-epic-fg"
          eyebrow="About 5 minutes"
          title="Start with my real project"
          body="A guided 5-step flow turns what you are building into a real PRD, Epics, and an Artifact Graph you can keep."
          cta="Start guided setup"
          loading={isLoading && loadingPath === "real"}
          disabled={isLoading}
          onClick={onReal}
        />
      </div>
    </div>
  );
}

interface PathCardProps {
  icon: React.ElementType;
  accentClass: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  loading?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  onClick: () => void;
}

function PathCard({
  icon: Icon,
  accentClass,
  eyebrow,
  title,
  body,
  cta,
  loading,
  disabled,
  highlight,
  onClick,
}: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex h-full flex-col items-start gap-4 bg-card p-7 text-left transition-all duration-300 animate-rise-in",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {/* sweep border on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, hsl(var(--accent) / 0.08) 50%, transparent 70%)",
        }}
      />
      <div className="flex w-full items-center justify-between">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            accentClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      <div>
        <h3 className="font-display text-[22px] font-semibold leading-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <span
        className={cn(
          "mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium",
          highlight ? "text-accent" : "text-foreground",
          highlight && !disabled && "animate-eye-pull rounded-md px-2 py-1 -mx-2 -my-1",
        )}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {loading ? "Loading…" : cta}
        {!loading && (
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
    </button>
  );
}
