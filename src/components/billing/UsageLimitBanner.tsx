import { AlertTriangle, TrendingUp, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useUsageLimits, getUsageMessage } from "@/hooks/useUsageLimits";

interface UsageLimitBannerProps {
  showFor?: ("artifact" | "project" | "aiRun" | "storage")[];
  dismissible?: boolean;
}

export function UsageLimitBanner({ 
  showFor = ["artifact", "project", "aiRun", "storage"],
  dismissible = true 
}: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const {
    artifactWarning,
    projectWarning,
    aiRunWarning,
    storageWarning,
    artifactAtLimit,
    projectAtLimit,
    aiRunAtLimit,
    storageAtLimit,
    isLoading,
  } = useUsageLimits();

  if (isLoading || dismissed) return null;

  // Collect all warnings and limits
  const alerts: { type: "artifact" | "project" | "aiRun" | "storage"; isAtLimit: boolean }[] = [];

  if (showFor.includes("artifact") && (artifactWarning || artifactAtLimit)) {
    alerts.push({ type: "artifact", isAtLimit: artifactAtLimit });
  }
  if (showFor.includes("project") && (projectWarning || projectAtLimit)) {
    alerts.push({ type: "project", isAtLimit: projectAtLimit });
  }
  if (showFor.includes("aiRun") && (aiRunWarning || aiRunAtLimit)) {
    alerts.push({ type: "aiRun", isAtLimit: aiRunAtLimit });
  }
  if (showFor.includes("storage") && (storageWarning || storageAtLimit)) {
    alerts.push({ type: "storage", isAtLimit: storageAtLimit });
  }

  if (alerts.length === 0) return null;

  // Show the most critical alert (limits first, then warnings)
  const criticalAlert = alerts.find((a) => a.isAtLimit) || alerts[0];
  const isAtLimit = criticalAlert.isAtLimit;
  const message = getUsageMessage(criticalAlert.type, isAtLimit);

  return (
    <Alert
      className={`mb-4 ${
        isAtLimit
          ? "border-destructive/50 bg-destructive/5"
          : "border-warning/50 bg-warning/5"
      }`}
    >
      {isAtLimit ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : (
        <TrendingUp className="h-4 w-4 text-warning" />
      )}
      <AlertDescription className="flex items-center justify-between w-full">
        <span className={isAtLimit ? "text-destructive" : "text-warning"}>
          {message}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/billing")}
            className={
              isAtLimit
                ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                : "border-warning/50 text-warning hover:bg-warning/10"
            }
          >
            Upgrade Plan
          </Button>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
