import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Artifact } from "@/hooks/useArtifacts";

/**
 * Shared row component for any "list of artifacts" question view.
 * Keeps the visual rhythm consistent across Orphans / Coverage gaps /
 * Drift / Recently changed.
 */
export function ArtifactListRow({
  artifact,
  trailing,
  badge,
  badgeTone = "muted",
  description,
}: {
  artifact: Pick<Artifact, "id" | "short_id" | "title" | "type" | "status">;
  trailing?: ReactNode;
  badge?: string;
  badgeTone?: "muted" | "warning" | "destructive" | "accent";
  description?: ReactNode;
}) {
  const navigate = useNavigate();

  const badgeClass = {
    muted: "border-border text-muted-foreground bg-muted/40",
    warning: "border-warning/20 text-warning bg-warning/10",
    destructive: "border-destructive/20 text-destructive bg-destructive/10",
    accent: "border-accent/20 text-accent bg-accent/10",
  }[badgeTone];

  return (
    <button
      onClick={() => navigate(`/artifacts/${artifact.id}`)}
      className={cn(
        "group w-full text-left grid items-center gap-3 px-6 py-2.5",
        "border-b border-border/60 hover:bg-muted/40 transition-colors",
      )}
      style={{ gridTemplateColumns: "70px 70px 1fr auto auto auto" }}
    >
      <span className="font-mono text-[10px] text-muted-foreground/80">
        {artifact.short_id}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {artifact.type}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] text-foreground truncate">
          {artifact.title}
        </div>
        {description && (
          <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
            {description}
          </div>
        )}
      </div>
      {badge && (
        <span
          className={cn(
            "text-[10px] font-medium tracking-wide rounded border px-1.5 py-0.5",
            badgeClass,
          )}
        >
          {badge}
        </span>
      )}
      <span className="text-[11px] text-muted-foreground/70 tabular-nums">
        {trailing}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
    </button>
  );
}

export function EmptyQuestion({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="mx-auto max-w-md text-center py-16 px-6">
      <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
      <p className="text-[12px] text-muted-foreground mt-1.5">{body}</p>
      {hint && (
        <p className="text-[11px] text-muted-foreground/60 mt-3">{hint}</p>
      )}
    </div>
  );
}
