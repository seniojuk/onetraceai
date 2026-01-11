import { 
  Bot, 
  Settings2, 
  Play, 
  MoreVertical, 
  Zap, 
  Brain,
  Shield,
  FileText,
  TestTube2,
  Users,
  Code,
  Eye,
  BookOpen,
  Link2,
  AlertTriangle,
  Rocket
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  agent: AgentConfig & { default_model: { id: string; model_name: string; display_name: string } | null };
  onConfigure: (agent: AgentConfig) => void;
  onInvoke: (agent: AgentConfig) => void;
  onToggle: (agent: AgentConfig, enabled: boolean) => void;
  onDelete: (agent: AgentConfig) => void;
}

const agentTypeConfig: Record<AgentType, { icon: React.ElementType; color: string; bgColor: string }> = {
  PRODUCT_AGENT: { icon: FileText, color: "text-purple-600", bgColor: "bg-purple-100" },
  STORY_AGENT: { icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-100" },
  ARCHITECTURE_AGENT: { icon: Brain, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  UX_AGENT: { icon: Eye, color: "text-pink-600", bgColor: "bg-pink-100" },
  DEV_AGENT: { icon: Code, color: "text-green-600", bgColor: "bg-green-100" },
  QA_AGENT: { icon: TestTube2, color: "text-amber-600", bgColor: "bg-amber-100" },
  DRIFT_AGENT: { icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-100" },
  RELEASE_AGENT: { icon: Rocket, color: "text-cyan-600", bgColor: "bg-cyan-100" },
  SECURITY_AGENT: { icon: Shield, color: "text-red-600", bgColor: "bg-red-100" },
  DOCS_AGENT: { icon: FileText, color: "text-slate-600", bgColor: "bg-slate-100" },
  INTEGRATION_AGENT: { icon: Link2, color: "text-teal-600", bgColor: "bg-teal-100" },
  CUSTOM_AGENT: { icon: Bot, color: "text-violet-600", bgColor: "bg-violet-100" },
};

export function AgentCard({ agent, onConfigure, onInvoke, onToggle, onDelete }: AgentCardProps) {
  const config = agentTypeConfig[agent.agent_type] || agentTypeConfig.CUSTOM_AGENT;
  const Icon = config.icon;

  return (
    <Card className={cn(
      "card-hover group relative",
      !agent.enabled && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {agent.agent_type.replace("_", " ")}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch 
              checked={agent.enabled ?? true}
              onCheckedChange={(checked) => onToggle(agent, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onConfigure(agent)}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onInvoke(agent)}>
                  <Play className="w-4 h-4 mr-2" />
                  Run Agent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(agent)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {agent.description && (
          <CardDescription className="mb-4 line-clamp-2">
            {agent.description}
          </CardDescription>
        )}
        
        <div className="space-y-3">
          {/* Model info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>{agent.default_model?.display_name || "No model configured"}</span>
          </div>
          
          {/* Capabilities */}
          <div className="flex flex-wrap gap-2">
            {agent.autonomous_enabled && (
              <Badge variant="outline" className="gap-1">
                <Zap className="w-3 h-3" />
                Autonomous
              </Badge>
            )}
            {agent.guardrails && (
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                Guardrails
              </Badge>
            )}
            {agent.routing_mode === "LOCKED" && (
              <Badge variant="outline">Locked Model</Badge>
            )}
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onConfigure(agent)}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Configure
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-accent hover:bg-accent/90"
            onClick={() => onInvoke(agent)}
            disabled={!agent.enabled}
          >
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
