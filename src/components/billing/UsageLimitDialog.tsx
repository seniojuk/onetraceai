import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { limitHeadline, limitRecovery, type LimitType } from "./usageCopy";

interface UsageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LimitType;
  isAtLimit?: boolean;
}

const pluralKey = (t: LimitType) =>
  t === "artifact" ? "artifacts"
  : t === "project" ? "projects"
  : t === "aiRun" ? "aiRuns"
  : t === "user" ? "users"
  : "storage";

/**
 * Reserved for true blocks (user clicked through an action that can't proceed).
 * Soft, not destructive-red. Two paths: free up space, or upgrade.
 */
export function UsageLimitDialog({
  open,
  onOpenChange,
  type,
  isAtLimit = true,
}: UsageLimitDialogProps) {
  const navigate = useNavigate();
  const { usage } = useUsageLimits();
  const metric = usage?.[pluralKey(type)];
  const used = metric?.used ?? 0;
  const limit = metric?.limit ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-warning/15">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <DialogTitle className="text-base">
              {limitHeadline(type, isAtLimit)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            <span className="tabular-nums font-medium text-foreground">{used}/{limit}</span>{" "}
            <span className="text-muted-foreground">used. {limitRecovery(type, isAtLimit)}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate("/settings?tab=workspace");
            }}
          >
            Free up space
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate("/settings?tab=billing");
            }}
          >
            See plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
