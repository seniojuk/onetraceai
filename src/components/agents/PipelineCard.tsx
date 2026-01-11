import { useState } from "react";
import { 
  Zap, 
  MoreHorizontal, 
  Play, 
  Settings, 
  Trash2, 
  ArrowRight,
  Clock,
  CheckCircle2,
  Bot,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { AgentPipeline } from "@/hooks/useAgentPipelines";

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
  lastRunStatus,
}: PipelineCardProps) {
  const getAgentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PRODUCT_AGENT: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      STORY_AGENT: "bg-green-500/10 text-green-500 border-green-500/30",
      QA_AGENT: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      ARCHITECTURE_AGENT: "bg-orange-500/10 text-orange-500 border-orange-500/30",
      UX_AGENT: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      SECURITY_AGENT: "bg-red-500/10 text-red-500 border-red-500/30",
      DOCS_AGENT: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  return (
    <Card className={`relative transition-all hover:shadow-md ${!pipeline.is_active ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">{pipeline.name}</CardTitle>
              <CardDescription className="line-clamp-1">
                {pipeline.description || `${pipeline.steps.length} step workflow`}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={pipeline.is_active}
              onCheckedChange={(checked) => onToggle(pipeline, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRun(pipeline)}>
                  <Play className="w-4 h-4 mr-2" />
                  Run Pipeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(pipeline)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(pipeline)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pipeline flow visualization */}
        <div className="flex items-center gap-1 flex-wrap py-2">
          {pipeline.steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1">
              {index > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              <Badge 
                variant="outline" 
                className={`text-xs ${getAgentTypeColor(step.agentType)}`}
              >
                <Bot className="w-3 h-3 mr-1" />
                {step.agentName.length > 15 ? step.agentName.slice(0, 15) + "..." : step.agentName}
              </Badge>
            </div>
          ))}
        </div>

        {/* Stats and actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Bot className="w-4 h-4" />
              {pipeline.steps.length} agents
            </span>
            {lastRunStatus && (
              <span className="flex items-center gap-1">
                {lastRunStatus === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : lastRunStatus === "running" ? (
                  <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
                ) : (
                  <Clock className="w-4 h-4 text-red-500" />
                )}
                Last: {lastRunStatus}
              </span>
            )}
          </div>
          
          <Button 
            size="sm" 
            onClick={() => onRun(pipeline)}
            disabled={!pipeline.is_active}
            className="bg-accent hover:bg-accent/90"
          >
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
