import {
  Bot,
  Settings2,
  Play,
  MoreHorizontal,
  Zap,
  Shield,
  FileText,
  TestTube2,
  Code,
  Eye,
  BookOpen,
  Link2,
  AlertTriangle,
  Rocket,
  Brain,
  Lock,
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
import type { AgentConfig, AgentType } from "@/hooks/useAgentConfigs";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: AgentConfig & {
    default_model: { id: string; model_name: string; display_name: string } | null;
  };
  onConfigure: (agent: AgentConfig) => void;
  onInvoke: (agent: AgentConfig) => void;
  onToggle: (agent: AgentConfig, enabled: boolean) => void;
  onDelete: (agent: AgentConfig) => void;
}

const agentIcon: Record<AgentType, React.ElementType> = {
  PRODUCT_AGENT: FileText,
  STORY_AGENT: BookOpen,
  ARCHITECTURE_AGENT: Brain,
  UX_AGENT: Eye,
  DEV_AGENT: Code,
  QA_AGENT: TestTube2,
  DRIFT_AGENT: AlertTriangle,
  RELEASE_AGENT: Rocket,
  SECURITY_AGENT: Shield,
  DOCS_AGENT: FileText,
  INTEGRATION_AGENT: Link2,
  CUSTOM_AGENT: Bot,
};

const typeLabel = (t: AgentType) => t.replace("_AGENT", "").replace("_", " ");

export function AgentCard({
  agent,
  onConfigure,
  onInvoke,
  onToggle,
  onDelete,
}: AgentCardProps) {
  const Icon = agentIcon[agent.agent_type] || Bot;
  const enabled = agent.enabled ?? true;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-border/80",
        !enabled && "opacity-60"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative">
        {/* Eyebrow + controls */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {typeLabel(agent.agent_type)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => onToggle(agent, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onInvoke(agent)} disabled={!enabled}>
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConfigure(agent)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(agent)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="mt-4 text-[16px] font-medium tracking-tight text-foreground">
          {agent.name}
        </h3>
        {agent.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {agent.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[12px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <Brain className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {agent.default_model?.display_name || "No model"}
            </span>
          </span>
          {agent.autonomous_enabled && (
            <span className="flex items-center gap-1 text-accent">
              <Zap className="h-3 w-3" />
              Auto
            </span>
          )}
          {agent.guardrails && (
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Guarded
            </span>
          )}
          {agent.routing_mode === "LOCKED" && (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onConfigure(agent)}>
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Configure
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => onInvoke(agent)}
            disabled={!enabled}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}
