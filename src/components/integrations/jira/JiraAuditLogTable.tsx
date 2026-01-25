import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Link2,
  Unlink,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJiraAuditLogs, JiraAuditLog } from "@/hooks/useJiraAuditLogs";
import { cn } from "@/lib/utils";

interface JiraAuditLogTableProps {
  workspaceId: string;
  projectId?: string;
  limit?: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  push: <ArrowUpCircle className="h-4 w-4 text-primary" />,
  pull: <ArrowDownCircle className="h-4 w-4 text-accent" />,
  connect: <Link2 className="h-4 w-4 text-success" />,
  disconnect: <Unlink className="h-4 w-4 text-destructive" />,
  configure: <Settings className="h-4 w-4 text-muted-foreground" />,
  resolve_conflict: <FileText className="h-4 w-4 text-warning" />,
};

const resultBadges: Record<string, { label: string; className: string }> = {
  success: { label: "Success", className: "bg-success/10 text-success border-success/30" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/30" },
  failure: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

function AuditLogRow({ log }: { log: JiraAuditLog }) {
  const [expanded, setExpanded] = useState(false);

  const actionIcon = actionIcons[log.action] || <FileText className="h-4 w-4" />;
  const resultConfig = resultBadges[log.result] || resultBadges.failure;

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <TableRow
        className={cn("cursor-pointer", expanded && "bg-muted/50")}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-10">
          {actionIcon}
        </TableCell>
        <TableCell className="font-medium">
          {formatAction(log.action)}
        </TableCell>
        <TableCell>
          <Badge className={resultConfig.className}>{resultConfig.label}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {log.jira_issue_keys?.length ? (
            <span className="font-mono text-xs">
              {log.jira_issue_keys.slice(0, 3).join(", ")}
              {log.jira_issue_keys.length > 3 && ` +${log.jira_issue_keys.length - 3}`}
            </span>
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {log.created_at
            ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
            : "-"}
        </TableCell>
        <TableCell className="w-10">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="py-3">
            <div className="space-y-2 text-sm">
              {log.actor_type && (
                <div>
                  <span className="text-muted-foreground">Actor:</span>{" "}
                  <span className="font-medium capitalize">{log.actor_type}</span>
                </div>
              )}
              {log.action_details && Object.keys(log.action_details).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Details:</span>
                  <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto max-h-32">
                    {JSON.stringify(log.action_details, null, 2)}
                  </pre>
                </div>
              )}
              {log.error_message && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-destructive font-medium">Error:</span>
                  <p className="text-destructive/80 mt-1">{log.error_message}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function JiraAuditLogTable({
  workspaceId,
  projectId,
  limit = 50,
}: JiraAuditLogTableProps) {
  const { data: logs, isLoading } = useJiraAuditLogs(workspaceId, projectId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sync Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {logs && logs.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No sync activity yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Activity will appear here after pushing or pulling issues
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
