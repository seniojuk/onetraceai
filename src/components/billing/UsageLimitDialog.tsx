import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUsageMessage } from "@/hooks/useUsageLimits";

interface UsageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "artifact" | "project" | "aiRun" | "storage";
  isAtLimit?: boolean;
}

export function UsageLimitDialog({
  open,
  onOpenChange,
  type,
  isAtLimit = true,
}: UsageLimitDialogProps) {
  const navigate = useNavigate();
  const message = getUsageMessage(type, isAtLimit);

  const typeLabels = {
    artifact: "Artifact",
    project: "Project",
    aiRun: "AI Run",
    storage: "Storage",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isAtLimit ? "bg-destructive/10" : "bg-warning/10"
              }`}
            >
              {isAtLimit ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <TrendingUp className="w-5 h-5 text-warning" />
              )}
            </div>
            <DialogTitle>
              {isAtLimit ? `${typeLabels[type]} Limit Reached` : `Approaching ${typeLabels[type]} Limit`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">{message}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {isAtLimit
              ? "To continue using this feature, please upgrade to a higher plan."
              : "Consider upgrading your plan to avoid interruptions."}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {isAtLimit ? "Cancel" : "Maybe Later"}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/billing");
            }}
            className="w-full sm:w-auto bg-accent hover:bg-accent/90"
          >
            {isAtLimit ? "Upgrade Now" : "View Plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
