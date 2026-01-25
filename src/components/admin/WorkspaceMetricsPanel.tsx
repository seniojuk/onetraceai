import { useAllWorkspaceMetrics, WorkspaceMetrics } from "@/hooks/useWorkspaceMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Users, FolderKanban, FileText, Sparkles, HardDrive, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

function UsageBar({ 
  used, 
  limit, 
  label 
}: { 
  used: number; 
  limit: number | null; 
  label: string;
}) {
  if (limit === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{used}</span>
              <Badge variant="outline" className="text-xs">Unlimited</Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}: {used} (no limit)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-24">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={isAtLimit ? "text-destructive font-medium" : isWarning ? "text-amber-600 font-medium" : ""}>
                {used}/{limit}
              </span>
              {isAtLimit && <AlertTriangle className="w-3 h-3 text-destructive" />}
            </div>
            <Progress 
              value={percentage} 
              className={`h-1.5 ${isAtLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : ""}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}: {used} of {limit} ({percentage.toFixed(1)}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function StorageUsageBar({ 
  usedBytes, 
  limitMb 
}: { 
  usedBytes: number; 
  limitMb: number | null;
}) {
  const usedMb = usedBytes / (1024 * 1024);
  
  if (limitMb === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatBytes(usedBytes)}</span>
              <Badge variant="outline" className="text-xs">Unlimited</Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Storage: {formatBytes(usedBytes)} (no limit)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const percentage = limitMb > 0 ? Math.min((usedMb / limitMb) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-24">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={isAtLimit ? "text-destructive font-medium" : isWarning ? "text-amber-600 font-medium" : ""}>
                {usedMb.toFixed(1)}/{limitMb}MB
              </span>
              {isAtLimit && <AlertTriangle className="w-3 h-3 text-destructive" />}
            </div>
            <Progress 
              value={percentage} 
              className={`h-1.5 ${isAtLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : ""}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Storage: {formatBytes(usedBytes)} of {limitMb}MB ({percentage.toFixed(1)}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getPlanBadgeVariant(planId: string | null): "default" | "secondary" | "outline" {
  switch (planId) {
    case "enterprise":
      return "default";
    case "pro":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "trialing":
      return "secondary";
    case "past_due":
    case "canceled":
      return "destructive";
    default:
      return "outline";
  }
}

export function WorkspaceMetricsPanel() {
  const { data: workspaces, isLoading, error } = useAllWorkspaceMetrics();

  // Calculate summary stats
  const totalWorkspaces = workspaces?.length || 0;
  const totalMembers = workspaces?.reduce((acc, w) => acc + w.member_count, 0) || 0;
  const totalProjects = workspaces?.reduce((acc, w) => acc + w.project_count, 0) || 0;
  const totalArtifacts = workspaces?.reduce((acc, w) => acc + w.artifact_count, 0) || 0;
  const totalAIRuns = workspaces?.reduce((acc, w) => acc + w.ai_runs_this_month, 0) || 0;
  const workspacesAtLimit = workspaces?.filter(w => {
    const projectsAtLimit = w.max_projects !== null && w.project_count >= w.max_projects;
    const artifactsAtLimit = w.max_artifacts !== null && w.artifact_count >= w.max_artifacts;
    const aiRunsAtLimit = w.max_ai_runs_per_month !== null && w.ai_runs_this_month >= w.max_ai_runs_per_month;
    return projectsAtLimit || artifactsAtLimit || aiRunsAtLimit;
  }).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle>Workspace Usage Overview</CardTitle>
        </div>
        <CardDescription>
          Platform-wide workspace metrics and quota usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalWorkspaces}</div>
            <div className="text-xs text-muted-foreground">Workspaces</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
            <div className="text-xs text-muted-foreground">Total Members</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalProjects}</div>
            <div className="text-xs text-muted-foreground">Total Projects</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalArtifacts}</div>
            <div className="text-xs text-muted-foreground">Total Artifacts</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalAIRuns}</div>
            <div className="text-xs text-muted-foreground">AI Runs (Month)</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${workspacesAtLimit > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
            <div className={`text-2xl font-bold ${workspacesAtLimit > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {workspacesAtLimit}
            </div>
            <div className="text-xs text-muted-foreground">At Limit</div>
          </div>
        </div>

        {/* Workspace Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Failed to load workspace metrics
          </div>
        ) : !workspaces || workspaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No workspaces found
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Members</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-3 h-3" />
                      <span>Projects</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>Artifacts</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Runs</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span>Storage</span>
                    </div>
                  </TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{workspace.name}</span>
                        {workspace.slug && (
                          <span className="text-xs text-muted-foreground">{workspace.slug}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getPlanBadgeVariant(workspace.plan_id)} className="w-fit capitalize">
                          {workspace.plan_id || "Free"}
                        </Badge>
                        {workspace.subscription_status && workspace.subscription_status !== "active" && (
                          <Badge variant={getStatusBadgeVariant(workspace.subscription_status)} className="w-fit text-xs">
                            {workspace.subscription_status}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{workspace.member_count}</span>
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={workspace.project_count} 
                        limit={workspace.max_projects}
                        label="Projects"
                      />
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={workspace.artifact_count} 
                        limit={workspace.max_artifacts}
                        label="Artifacts"
                      />
                    </TableCell>
                    <TableCell>
                      <UsageBar 
                        used={workspace.ai_runs_this_month} 
                        limit={workspace.max_ai_runs_per_month}
                        label="AI Runs (this month)"
                      />
                    </TableCell>
                    <TableCell>
                      <StorageUsageBar 
                        usedBytes={workspace.storage_bytes} 
                        limitMb={workspace.max_storage_mb}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(workspace.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
