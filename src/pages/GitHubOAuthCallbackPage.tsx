import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGitHubOAuthCallback } from "@/hooks/useGitHubConnection";

export default function GitHubOAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  const oauthCallback = useGitHubOAuthCallback();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setErrorMessage(errorDescription || error || "Authorization was denied");
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Missing authorization code or state parameter");
      return;
    }

    oauthCallback.mutate(
      { code, state },
      {
        onSuccess: () => {
          setStatus("success");
          setTimeout(() => {
            navigate("/integrations", { replace: true });
          }, 2000);
        },
        onError: (err) => {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to complete authorization");
        },
      }
    );
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === "processing" && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <div>
                <h2 className="text-lg font-medium text-foreground">Connecting to GitHub</h2>
                <p className="text-sm text-muted-foreground mt-1">Please wait while we complete the authorization...</p>
              </div>
            </div>
          )}
          {status === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <div>
                <h2 className="text-lg font-medium text-foreground">Connection Successful!</h2>
                <p className="text-sm text-muted-foreground mt-1">GitHub has been connected. Redirecting you back...</p>
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-lg font-medium text-foreground">Connection Failed</h2>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button onClick={() => navigate("/integrations", { replace: true })} variant="outline">
                Back to Integrations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
