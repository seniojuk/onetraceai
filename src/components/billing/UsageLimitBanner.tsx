import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { limitHeadline, limitRecovery, type LimitType } from "./usageCopy";

interface UsageLimitBannerProps {
  showFor?: LimitType[];
  dismissible?: boolean;
}

/**
 * Inline, single-line quota banner.
 * Severity-tiered: warning = soft, atLimit = strong (never destructive-red unless truly blocking).
 * Dismissal persists for 24h per (workspace, type) — no per-pageload nagging.
 */
export function UsageLimitBanner({
  showFor = ["artifact", "project", "aiRun", "storage"],
  dismissible = true,
}: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const [dismissedNow, setDismissedNow] = useState(false);
  const {
    artifactWarning, projectWarning, aiRunWarning, storageWarning,
    artifactAtLimit, projectAtLimit, aiRunAtLimit, storageAtLimit,
    usage, isLoading,
  } = useUsageLimits();

  if (isLoading || dismissedNow || !usage) return null;

  const alerts: { type: LimitType; atLimit: boolean }[] = [];
  if (showFor.includes("artifact") && (artifactWarning || artifactAtLimit))
    alerts.push({ type: "artifact", atLimit: artifactAtLimit });
  if (showFor.includes("project") && (projectWarning || projectAtLimit))
    alerts.push({ type: "project", atLimit: projectAtLimit });
  if (showFor.includes("aiRun") && (aiRunWarning || aiRunAtLimit))
    alerts.push({ type: "aiRun", atLimit: aiRunAtLimit });
  if (showFor.includes("storage") && (storageWarning || storageAtLimit))
    alerts.push({ type: "storage", atLimit: storageAtLimit });

  if (alerts.length === 0) return null;

  const a = alerts.find((x) => x.atLimit) ?? alerts[0];
  const dismissKey = `usage-banner:${a.type}:${a.atLimit ? "limit" : "warn"}`;

  if (typeof window !== "undefined") {
    const until = Number(localStorage.getItem(dismissKey) ?? 0);
    if (until > Date.now()) return null;
  }

  const metric = usage[plural(a.type)];
  const used = metric.used;
  const limit = metric.limit ?? 0;
  const remaining = Math.max(0, limit - used);
  const tone = a.atLimit ? "limit" : "warn";

  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(dismissKey, String(Date.now() + 24 * 60 * 60 * 1000));
    }
    setDismissedNow(true);
  };

  return (
    <div
      role="status"
      className={[
        "mb-4 flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        tone === "limit"
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-hairline bg-muted/50 text-foreground",
      ].join(" ")}
    >
      <AlertTriangle
        className={[
          "h-4 w-4 shrink-0",
          tone === "limit" ? "text-warning" : "text-muted-foreground",
        ].join(" ")}
        aria-hidden
      />
      <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
        <span className="font-medium">{limitHeadline(a.type, a.atLimit)}</span>
        <span className="text-muted-foreground tabular-nums">
          {used}/{limit}
          {!a.atLimit && remaining > 0 ? ` · ${remaining} left` : ""}
        </span>
        <span className="text-muted-foreground">{limitRecovery(a.type, a.atLimit)}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => navigate("/settings?tab=billing")}
      >
        Manage
      </Button>
      <Button
        variant={tone === "limit" ? "default" : "outline"}
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() => navigate("/settings?tab=billing")}
      >
        Upgrade
      </Button>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function plural(t: LimitType): "artifacts" | "projects" | "aiRuns" | "storage" | "users" {
  return t === "artifact" ? "artifacts"
    : t === "project" ? "projects"
    : t === "aiRun" ? "aiRuns"
    : t === "user" ? "users"
    : "storage";
}
