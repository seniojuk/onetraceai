import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "valid" | "done" | "already" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState("error"); setError("Missing token"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } }
        );
        const data = await res.json();
        if (!res.ok) { setState("error"); setError(data.error || "Invalid link"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") setState("already");
        else if (data.valid) setState("valid");
        else { setState("error"); setError("Invalid link"); }
      } catch (e) {
        setState("error");
        setError(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setState(data.success ? "done" : "already");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Failed to unsubscribe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>
            {state === "loading" && "Validating your link..."}
            {state === "valid" && "Click below to unsubscribe from these emails."}
            {state === "done" && "You've been unsubscribed."}
            {state === "already" && "You're already unsubscribed."}
            {state === "error" && (error || "This link is invalid or expired.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          )}
          {state === "valid" && (
            <Button className="w-full" onClick={confirm} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm unsubscribe
            </Button>
          )}
          {(state === "done" || state === "already") && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <Button variant="outline" asChild><Link to="/">Return home</Link></Button>
            </div>
          )}
          {state === "error" && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="w-10 h-10 text-destructive" />
              <Button variant="outline" asChild><Link to="/">Return home</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
