import { useMemo } from "react";
import { useUsageMetrics, UsageMetrics } from "./useUsageMetrics";
import { useUIStore } from "@/store/uiStore";
import { useCheckSubscription } from "./useBilling";

export interface UsageLimitStatus {
  canCreateArtifact: boolean;
  canCreateProject: boolean;
  canRunAI: boolean;
  canUploadFile: boolean;
  artifactWarning: boolean;
  projectWarning: boolean;
  aiRunWarning: boolean;
  storageWarning: boolean;
  artifactAtLimit: boolean;
  projectAtLimit: boolean;
  aiRunAtLimit: boolean;
  storageAtLimit: boolean;
  isLoading: boolean;
  usage: UsageMetrics | undefined;
}

const WARNING_THRESHOLD = 0.8; // 80%

export function useUsageLimits(): UsageLimitStatus {
  const { currentWorkspaceId } = useUIStore();
  const { data: subscriptionStatus, isLoading: statusLoading } = useCheckSubscription();
  
  const currentPlanId = subscriptionStatus?.plan_id || "free";
  const { data: usage, isLoading: usageLoading } = useUsageMetrics(currentWorkspaceId ?? undefined, currentPlanId);

  return useMemo(() => {
    if (!usage) {
      return {
        canCreateArtifact: true,
        canCreateProject: true,
        canRunAI: true,
        canUploadFile: true,
        artifactWarning: false,
        projectWarning: false,
        aiRunWarning: false,
        storageWarning: false,
        artifactAtLimit: false,
        projectAtLimit: false,
        aiRunAtLimit: false,
        storageAtLimit: false,
        isLoading: statusLoading || usageLoading,
        usage: undefined,
      };
    }

    const getPercentage = (used: number, limit: number | null) => {
      if (limit === null) return 0; // Unlimited
      return limit === 0 ? 100 : (used / limit) * 100;
    };

    const artifactPct = getPercentage(usage.artifacts.used, usage.artifacts.limit);
    const projectPct = getPercentage(usage.projects.used, usage.projects.limit);
    const aiRunPct = getPercentage(usage.aiRuns.used, usage.aiRuns.limit);
    const storagePct = getPercentage(usage.storage.used, usage.storage.limit);

    const artifactAtLimit = usage.artifacts.limit !== null && usage.artifacts.used >= usage.artifacts.limit;
    const projectAtLimit = usage.projects.limit !== null && usage.projects.used >= usage.projects.limit;
    const aiRunAtLimit = usage.aiRuns.limit !== null && usage.aiRuns.used >= usage.aiRuns.limit;
    const storageAtLimit = usage.storage.limit !== null && usage.storage.used >= usage.storage.limit;

    return {
      canCreateArtifact: !artifactAtLimit,
      canCreateProject: !projectAtLimit,
      canRunAI: !aiRunAtLimit,
      canUploadFile: !storageAtLimit,
      artifactWarning: artifactPct >= WARNING_THRESHOLD * 100 && !artifactAtLimit,
      projectWarning: projectPct >= WARNING_THRESHOLD * 100 && !projectAtLimit,
      aiRunWarning: aiRunPct >= WARNING_THRESHOLD * 100 && !aiRunAtLimit,
      storageWarning: storagePct >= WARNING_THRESHOLD * 100 && !storageAtLimit,
      artifactAtLimit,
      projectAtLimit,
      aiRunAtLimit,
      storageAtLimit,
      isLoading: statusLoading || usageLoading,
      usage,
    };
  }, [usage, statusLoading, usageLoading]);
}

export function getUsageMessage(type: "artifact" | "project" | "aiRun" | "storage", isAtLimit: boolean): string {
  const limitMessages = {
    artifact: "You've reached your artifact limit. Upgrade your plan to create more artifacts.",
    project: "You've reached your project limit. Upgrade your plan to create more projects.",
    aiRun: "You've used all your AI runs for this month. Upgrade your plan or wait until next month.",
    storage: "You've reached your storage limit. Upgrade your plan for more storage.",
  };

  const warningMessages = {
    artifact: "You're approaching your artifact limit.",
    project: "You're approaching your project limit.",
    aiRun: "You're approaching your monthly AI run limit.",
    storage: "You're approaching your storage limit.",
  };

  return isAtLimit ? limitMessages[type] : warningMessages[type];
}
