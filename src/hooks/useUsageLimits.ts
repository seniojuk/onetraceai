import { useMemo } from "react";
import { useUsageMetrics, UsageMetrics } from "./useUsageMetrics";
import { useUIStore } from "@/store/uiStore";
import { useCheckSubscription } from "./useBilling";

export interface UsageLimitStatus {
  canCreateArtifact: boolean;
  canCreateProject: boolean;
  canRunAI: boolean;
  canUploadFile: boolean;
  canInviteMember: boolean;
  artifactWarning: boolean;
  projectWarning: boolean;
  aiRunWarning: boolean;
  storageWarning: boolean;
  userWarning: boolean;
  artifactAtLimit: boolean;
  projectAtLimit: boolean;
  aiRunAtLimit: boolean;
  storageAtLimit: boolean;
  userAtLimit: boolean;
  isLoading: boolean;
  usage: UsageMetrics | undefined;
}

const WARNING_THRESHOLD = 0.8; // 80%

export function useUsageLimits(): UsageLimitStatus {
  const { currentWorkspaceId } = useUIStore();
  const { data: subscriptionStatus, isLoading: statusLoading } = useCheckSubscription();

  const currentPlanId = subscriptionStatus?.plan_id || "starter";
  const { data: usage, isLoading: usageLoading } = useUsageMetrics(currentWorkspaceId ?? undefined, currentPlanId);

  return useMemo(() => {
    if (!usage) {
      return {
        canCreateArtifact: true,
        canCreateProject: true,
        canRunAI: true,
        canUploadFile: true,
        canInviteMember: true,
        artifactWarning: false,
        projectWarning: false,
        aiRunWarning: false,
        storageWarning: false,
        userWarning: false,
        artifactAtLimit: false,
        projectAtLimit: false,
        aiRunAtLimit: false,
        storageAtLimit: false,
        userAtLimit: false,
        isLoading: statusLoading || usageLoading,
        usage: undefined,
      };
    }

    const pct = (used: number, limit: number | null) => {
      if (limit === null) return 0;
      return limit === 0 ? 100 : (used / limit) * 100;
    };
    const atLimit = (used: number, limit: number | null) =>
      limit !== null && used >= limit;

    const artifactAtLimit = atLimit(usage.artifacts.used, usage.artifacts.limit);
    const projectAtLimit = atLimit(usage.projects.used, usage.projects.limit);
    const aiRunAtLimit = atLimit(usage.aiRuns.used, usage.aiRuns.limit);
    const storageAtLimit = atLimit(usage.storage.used, usage.storage.limit);
    const userAtLimit = atLimit(usage.users.used, usage.users.limit);

    return {
      canCreateArtifact: !artifactAtLimit,
      canCreateProject: !projectAtLimit,
      canRunAI: !aiRunAtLimit,
      canUploadFile: !storageAtLimit,
      canInviteMember: !userAtLimit,
      artifactWarning: pct(usage.artifacts.used, usage.artifacts.limit) >= WARNING_THRESHOLD * 100 && !artifactAtLimit,
      projectWarning: pct(usage.projects.used, usage.projects.limit) >= WARNING_THRESHOLD * 100 && !projectAtLimit,
      aiRunWarning: pct(usage.aiRuns.used, usage.aiRuns.limit) >= WARNING_THRESHOLD * 100 && !aiRunAtLimit,
      storageWarning: pct(usage.storage.used, usage.storage.limit) >= WARNING_THRESHOLD * 100 && !storageAtLimit,
      userWarning: pct(usage.users.used, usage.users.limit) >= WARNING_THRESHOLD * 100 && !userAtLimit,
      artifactAtLimit,
      projectAtLimit,
      aiRunAtLimit,
      storageAtLimit,
      userAtLimit,
      isLoading: statusLoading || usageLoading,
      usage,
    };
  }, [usage, statusLoading, usageLoading]);
}

export function getUsageMessage(
  type: "artifact" | "project" | "aiRun" | "storage" | "user",
  isAtLimit: boolean
): string {
  const limitMessages = {
    artifact: "You've reached your artifact limit. Upgrade your plan to create more artifacts.",
    project: "You've reached your project limit. Upgrade your plan to create more projects.",
    aiRun: "You've used all your AI runs for this month. Upgrade your plan or wait until next month.",
    storage: "You've reached your storage limit. Upgrade your plan for more storage.",
    user: "You've reached your seat limit. Upgrade your plan to invite more teammates.",
  };

  const warningMessages = {
    artifact: "You're approaching your artifact limit.",
    project: "You're approaching your project limit.",
    aiRun: "You're approaching your monthly AI run limit.",
    storage: "You're approaching your storage limit.",
    user: "You're approaching your seat limit.",
  };

  return isAtLimit ? limitMessages[type] : warningMessages[type];
}
