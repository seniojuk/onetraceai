import {
  Zap,
  MoreHorizontal,
  Play,
  Settings2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { AgentPipeline } from "@/hooks/useAgentPipelines";
import { cn } from "@/lib/utils";

interface PipelineCardProps {
  pipeline: AgentPipeline;
  onRun: (pipeline: AgentPipeline) => void;
  onEdit: (pipeline: AgentPipeline) => void;
  onToggle: (pipeline: AgentPipeline, active: boolean) => void;
  onDelete: (pipeline: AgentPipeline) => void;
  lastRunStatus?: "completed" | "failed" | "running";
}

export function PipelineCard({
  pipeline,
  onRun,
  onEdit,
  onToggle,
  onDelete,
}: PipelineCardProps) {
  const active = pipeline.is_active;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors",
        active ? "hover:border-foreground/20" : "opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-[2px]",
          active ? "bg-accent/70" : "bg-border"
        )}
      />

      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Pipeline · {pipeline.steps.length} step{pipeline.steps.length === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="truncate font-display text-lg font-semibold text-foreground">
            {pipeline.name}
          </h3>
          {pipeline.description && (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {pipeline.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Switch
            checked={active}
            onCheckedChange={(checked) => onToggle(pipeline, checked)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRun(pipeline)} disabled={!active}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(pipeline)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(pipeline)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Flow */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {pipeline.steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1.5">
              {index > 0 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              )}
              <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground">
                {step.agentName.length > 18
                  ? step.agentName.slice(0, 18) + "…"
                  : step.agentName}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        <button
          onClick={() => onEdit(pipeline)}
          className="flex items-center justify-center gap-2 border-r border-border py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => onRun(pipeline)}
          disabled={!active}
          className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      </div>
    </div>
  );
}
