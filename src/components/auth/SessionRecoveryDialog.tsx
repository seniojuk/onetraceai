import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SessionRecoveryDialogProps {
  open: boolean;
  onRecovered: () => void;
  userEmail?: string;
}

export function SessionRecoveryDialog({ open, onRecovered, userEmail }: SessionRecoveryDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (error) {
        toast.error("Login failed", { description: error.message });
      } else {
        toast.success("Session restored successfully");
        setPassword("");
        onRecovered();
      }
    } catch {
      toast.error("Failed to restore session");
    } finally {
      setLoading(false);
    }
  };

  const handleFullLogout = () => {
    supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <DialogTitle>Session Expired</DialogTitle>
          </div>
          <DialogDescription>
            Your session has expired. Please re-enter your password to continue where you left off.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleReLogin}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                value={userEmail || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-password">Password</Label>
              <Input
                id="recovery-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={handleFullLogout}>
              Go to Login
            </Button>
            <Button type="submit" disabled={loading || !password}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
