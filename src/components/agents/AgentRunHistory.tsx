import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Bot,
  Brain,
  Coins,
  FileText,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { AIRun, AIRunStatus } from "@/hooks/useAIRuns";
import { cn } from "@/lib/utils";
import { AgentRunResultsDialog } from "./AgentRunResultsDialog";

interface AgentRunHistoryProps {
  runs: (AIRun & { 
    agent_config: { id: string; name: string; agent_type: string } | null;
    model: { id: string; model_name: string; display_name: string } | null;
  })[];
  isLoading?: boolean;
  onViewRun?: (run: AIRun) => void;
  workspaceId: string;
  projectId?: string;
}

const statusConfig: Record<AIRunStatus, { icon: React.ElementType; color: string; bgColor: string }> = {
  PENDING: { icon: Clock, color: "text-slate-600", bgColor: "bg-slate-100" },
  RUNNING: { icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  FAILED: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" },
  CANCELLED: { icon: XCircle, color: "text-amber-600", bgColor: "bg-amber-100" },
};

export function AgentRunHistory({ runs, isLoading, onViewRun, workspaceId, projectId }: AgentRunHistoryProps) {
  const [selectedRun, setSelectedRun] = useState<typeof runs[number] | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);

  const handleViewRun = (run: typeof runs[number]) => {
    setSelectedRun(run);
    setResultsDialogOpen(true);
    onViewRun?.(run);
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!runs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Runs</CardTitle>
          <CardDescription>No runs yet. Invoke an agent to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Runs</CardTitle>
          <Badge variant="secondary">{runs.length} runs</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {runs.map((run) => {
              const status = statusConfig[run.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              const outputCount = Array.isArray(run.output_artifacts) 
                ? run.output_artifacts.length 
                : 0;

              return (
                <div 
                  key={run.id} 
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewRun(run)}
                >
                  <div className={cn("p-2 rounded-lg", status.bgColor)}>
                    <StatusIcon className={cn(
                      "w-4 h-4",
                      status.color,
                      run.status === "RUNNING" && "animate-spin"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {run.agent_config?.name || "Unknown Agent"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {run.model && (
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {run.model.display_name}
                        </span>
                      )}
                      {run.started_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {run.status === "COMPLETED" && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span>{outputCount} outputs</span>
                        </div>
                        {run.total_cost !== null && run.total_cost > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Coins className="w-3 h-3" />
                            ${run.total_cost.toFixed(4)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {run.status === "FAILED" && (
                      <span className="text-xs text-red-600 max-w-32 truncate">
                        {run.error_message || "Failed"}
                      </span>
                    )}
                    
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", status.color)}
                    >
                      {run.status.toLowerCase()}
                    </Badge>
                    
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      <AgentRunResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        run={selectedRun}
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </Card>
  );
}
