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

export function AgentCard({ agent, onConfigure, onInvoke, onToggle, onDelete }: AgentCardProps) {
  const Icon = agentIcon[agent.agent_type] || Bot;
  const enabled = agent.enabled ?? true;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors",
        enabled ? "hover:border-foreground/20" : "opacity-60"
      )}
    >
      {/* Accent rail */}
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-[2px]",
          enabled ? "bg-accent/70" : "bg-border"
        )}
      />

      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {typeLabel(agent.agent_type)}
            </span>
          </div>
          <h3 className="truncate font-display text-lg font-semibold text-foreground">
            {agent.name}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onToggle(agent, checked)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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

      <div className="flex-1 px-5 pb-4">
        {agent.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {agent.description}
          </p>
        )}
      </div>

      {/* Meta footer */}
      <div className="flex items-center gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
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
      <div className="grid grid-cols-2 border-t border-border">
        <button
          onClick={() => onConfigure(agent)}
          className="flex items-center justify-center gap-2 border-r border-border py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Configure
        </button>
        <button
          onClick={() => onInvoke(agent)}
          disabled={!enabled}
          className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      </div>
    </div>
  );
}
