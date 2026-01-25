import { 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Building2,
  Clock,
  RefreshCw,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  useAllJiraConnections, 
  usePlatformAdmin,
  JiraConnectionAdminView 
} from "@/hooks/usePlatformAdmin";
import { cn } from "@/lib/utils";

export function JiraPlatformAdminPanel() {
  const { data: isPlatformAdmin, isLoading: adminLoading } = usePlatformAdmin();
  const { data: connections, isLoading: connectionsLoading } = useAllJiraConnections();

  if (adminLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="font-medium text-foreground mb-1">Access Denied</h3>
          <p className="text-sm text-muted-foreground">
            You need platform admin privileges to view this section.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (connectionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Jira Connections</CardTitle>
          <CardDescription>Platform-wide view of all workspace Jira connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-success/10 text-success border-success/30 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Degraded
          </Badge>
        );
      case "broken":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Broken
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const getTokenStatus = (tokenExpiresAt: string | null) => {
    if (!tokenExpiresAt) return null;
    
    const expiresAt = new Date(tokenExpiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
          Expired
        </Badge>
      );
    } else if (daysUntilExpiry <= 7) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/30 text-xs">
          Expires in {daysUntilExpiry}d
        </Badge>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">
        {daysUntilExpiry}d remaining
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          All Jira Connections ({connections?.length || 0})
        </CardTitle>
        <CardDescription>
          Platform-wide overview of all workspace Jira integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(!connections || connections.length === 0) ? (
          <div className="py-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground mb-1">No Connections</h3>
            <p className="text-sm text-muted-foreground">
              No workspaces have connected to Jira yet.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Jira Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Connected By</TableHead>
                <TableHead>Last Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{conn.workspace_name}</span>
                      {conn.workspace_slug && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({conn.workspace_slug})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={conn.jira_base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      {conn.jira_site_name || conn.jira_base_url.replace("https://", "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                  <TableCell>{getStatusBadge(conn.status)}</TableCell>
                  <TableCell>{getTokenStatus(conn.token_expires_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {conn.project_links_count} linked
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {conn.connected_by_name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {conn.last_successful_sync ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conn.last_successful_sync).toLocaleDateString()}
                      </div>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
