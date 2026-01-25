import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJiraConnectionHealth } from "@/hooks/useJiraAuditLogs";
import { cn } from "@/lib/utils";

interface JiraHealthStatusProps {
  connectionId: string;
  onRefreshToken?: () => void;
  isRefreshing?: boolean;
}

export function JiraHealthStatus({
  connectionId,
  onRefreshToken,
  isRefreshing,
}: JiraHealthStatusProps) {
  const { data: health, isLoading } = useJiraConnectionHealth(connectionId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connection Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  const getStatusIcon = () => {
    switch (health.status) {
      case "connected":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "broken":
      case "disconnected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      connected: { label: "Connected", className: "bg-success/10 text-success border-success/30" },
      degraded: { label: "Degraded", className: "bg-warning/10 text-warning border-warning/30" },
      broken: { label: "Broken", className: "bg-destructive/10 text-destructive border-destructive/30" },
      disconnected: { label: "Disconnected", className: "bg-muted text-muted-foreground" },
    };
    const config = statusConfig[health.status as keyof typeof statusConfig] || statusConfig.disconnected;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isTokenExpiringSoon = health.token_expires_at
    ? new Date(health.token_expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            Connection Health
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          {health.last_successful_sync && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Last sync:{" "}
                {formatDistanceToNow(new Date(health.last_successful_sync), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}

          {health.failure_count > 0 && (
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>{health.failure_count} recent failure(s)</span>
            </div>
          )}

          {health.last_error_message && (
            <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">Last Error:</p>
              <p className="text-xs text-destructive/80 mt-1 line-clamp-2">
                {health.last_error_message}
              </p>
              {health.last_error_at && (
                <p className="text-xs text-destructive/60 mt-1">
                  {formatDistanceToNow(new Date(health.last_error_at), {
                    addSuffix: true,
                  })}
                </p>
              )}
            </div>
          )}

          {isTokenExpiringSoon && health.token_expires_at && (
            <div className="flex items-center justify-between p-2 rounded-md bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">
                  Token expires{" "}
                  {formatDistanceToNow(new Date(health.token_expires_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {onRefreshToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshToken}
                  disabled={isRefreshing}
                  className="h-7 text-xs"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Refresh
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
