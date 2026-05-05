import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  valid: boolean;
  email: string;
  role: string;
  workspaceName: string | null;
}

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = params.get("token");

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Validate the token
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setError("Missing invitation token.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-invite-accept?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || "Invalid invitation");
        else setInfo(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load invitation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    if (!user) {
      // Stash and bounce to auth, preserving email hint
      sessionStorage.setItem("pendingInviteToken", token);
      const next = encodeURIComponent(`/invite/accept?token=${token}`);
      const emailParam = info?.email ? `&email=${encodeURIComponent(info.email)}` : "";
      navigate(`/auth?next=${next}${emailParam}`);
      return;
    }

    setAccepting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-invite-accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invitation");
      toast.success(`You've joined ${data.workspaceName ?? "the workspace"}!`);
      sessionStorage.removeItem("pendingInviteToken");
      navigate("/dashboard");
    } catch (e) {
      toast.error("Could not accept invitation", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {error ? (
              <XCircle className="w-6 h-6 text-destructive" />
            ) : (
              <Mail className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle>{error ? "Invitation unavailable" : "Workspace invitation"}</CardTitle>
          <CardDescription>
            {error
              ? error
              : info
              ? `You've been invited to join ${info.workspaceName ?? "a workspace"} as ${info.role}.`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!error && info && (
            <>
              <div className="text-sm text-muted-foreground text-center">
                Invitation for <span className="font-medium text-foreground">{info.email}</span>
              </div>

              {user && user.email?.toLowerCase() !== info.email.toLowerCase() && (
                <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded">
                  You're signed in as {user.email}. Please sign out and sign in with{" "}
                  <strong>{info.email}</strong> to accept this invitation.
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting || (!!user && user.email?.toLowerCase() !== info.email.toLowerCase())}
              >
                {accepting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {user ? "Accept invitation" : "Sign in to accept"}
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  Don't have an account yet? You'll be able to create one in the next step.
                </p>
              )}
            </>
          )}

          {error && (
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Return home
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
