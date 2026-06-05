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
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-border/80",
        !active && "opacity-60"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Pipeline · {pipeline.steps.length} step
              {pipeline.steps.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Switch
              checked={active}
              onCheckedChange={(checked) => onToggle(pipeline, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
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

        <h3 className="mt-4 text-[16px] font-medium tracking-tight text-foreground">
          {pipeline.name}
        </h3>
        {pipeline.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {pipeline.description}
          </p>
        )}

        {/* Flow */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
          {pipeline.steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1.5">
              {index > 0 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              )}
              <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground">
                {step.agentName.length > 18
                  ? step.agentName.slice(0, 18) + "…"
                  : step.agentName}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(pipeline)}>
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => onRun(pipeline)}
            disabled={!active}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}
