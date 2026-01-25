import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Shield
} from "lucide-react";
import { JiraConnection, useJiraOAuthInit, useJiraRefreshToken } from "@/hooks/useJiraConnection";

interface JiraConnectionStepProps {
  workspaceId: string;
  connection: JiraConnection | null;
  onSuccess: () => void;
}

export function JiraConnectionStep({
  workspaceId,
  connection,
  onSuccess,
}: JiraConnectionStepProps) {
  const { initiateOAuth, isInitiating } = useJiraOAuthInit();
  const refreshToken = useJiraRefreshToken();

  const isConnected = connection && connection.status !== "disconnected";
  const needsReauth = connection?.status === "broken";

  const handleConnect = async () => {
    await initiateOAuth(workspaceId);
  };

  const handleRefreshToken = async () => {
    if (!connection) return;
    await refreshToken.mutateAsync({
      connectionId: connection.id,
      workspaceId,
    });
  };

  // If already connected, show success state and allow proceeding
  if (isConnected && !needsReauth) {
    return (
      <div className="space-y-6">
        <Card className="border-success/50 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Connected to Jira Cloud</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {connection.jira_site_name || connection.jira_base_url}
                </p>
                {connection.last_successful_sync && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(connection.last_successful_sync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleRefreshToken} disabled={refreshToken.isPending}>
            {refreshToken.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Token
          </Button>
          <Button onClick={onSuccess}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Show reconnection UI if token is broken
  if (needsReauth) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your Jira connection has expired or been revoked. Please reconnect to continue syncing.
            {connection.last_error_message && (
              <span className="block mt-1 text-xs opacity-80">
                Error: {connection.last_error_message}
              </span>
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <img
                src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
                alt="Jira"
                className="w-16 h-16 mx-auto"
              />
              <div>
                <h3 className="font-medium text-foreground mb-1">Reconnect to Jira Cloud</h3>
                <p className="text-sm text-muted-foreground">
                  Click below to re-authorize OneTrace with your Atlassian account.
                </p>
              </div>
              <Button onClick={handleConnect} disabled={isInitiating} size="lg">
                {isInitiating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Reconnect Jira
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial connection flow
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <img
          src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
          alt="Jira"
          className="w-20 h-20 mx-auto"
        />
        <h3 className="text-lg font-medium text-foreground">Connect Jira Cloud</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Connect your Jira Cloud instance to sync epics, stories, and issues with OneTrace artifacts.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Permissions Required
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>Read access</strong> to Jira projects, issues, and fields</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>Write access</strong> to create and update issues</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>Offline access</strong> to maintain sync when you're away</span>
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              You'll be redirected to Atlassian to authorize access. Only workspace admins and owners can manage integrations. Your credentials are encrypted and never stored in plain text.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={handleConnect} disabled={isInitiating} size="lg" className="min-w-48">
          {isInitiating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect with Atlassian
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
