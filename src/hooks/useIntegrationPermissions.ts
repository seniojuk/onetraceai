import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCheckSubscription, useSubscription } from "./useBilling";
import { useAuth } from "./useAuth";
import { useUIStore } from "@/store/uiStore";

// Plans that have access to integrations
const INTEGRATION_ENABLED_PLANS = ["pro", "enterprise"];

export interface WorkspaceMemberRole {
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  canManageIntegrations: boolean;
  canConfigureSync: boolean;
  canPushPull: boolean;
}

export interface IntegrationPermissions {
  // Plan-based permissions
  hasIntegrationAccess: boolean;
  planId: string;
  
  // Role-based permissions
  role: WorkspaceMemberRole["role"] | null;
  canManageIntegrations: boolean;
  canConfigureSync: boolean;
  canPushPull: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Upgrade prompt
  requiresUpgrade: boolean;
  upgradeMessage: string;
}

export function useWorkspaceMemberRole(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-member-role", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role as WorkspaceMemberRole["role"] | null;
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useIntegrationPermissions(
  workspaceId: string | undefined
): IntegrationPermissions {
  const { currentWorkspaceId } = useUIStore();
  const effectiveWorkspaceId = workspaceId || currentWorkspaceId;
  
  const { data: subscriptionStatus, isLoading: stripeLoading } = useCheckSubscription();
  const { data: dbSubscription, isLoading: dbLoading } = useSubscription(effectiveWorkspaceId);
  const { data: role, isLoading: roleLoading } = useWorkspaceMemberRole(workspaceId);

  return useMemo(() => {
    // Use Stripe subscription if available, otherwise fall back to database subscription
    const stripePlanId = subscriptionStatus?.plan_id;
    const dbPlanId = dbSubscription?.plan_id;
    const planId = stripePlanId && stripePlanId !== "free" ? stripePlanId : (dbPlanId || "free");
    
    const hasIntegrationAccess = INTEGRATION_ENABLED_PLANS.includes(planId);
    const requiresUpgrade = !hasIntegrationAccess;

    // Role-based permission mapping
    const canManageIntegrations = role === "OWNER" || role === "ADMIN";
    const canConfigureSync = role === "OWNER" || role === "ADMIN";
    const canPushPull = role === "OWNER" || role === "ADMIN" || role === "MEMBER";

    return {
      hasIntegrationAccess,
      planId,
      role,
      canManageIntegrations: hasIntegrationAccess && canManageIntegrations,
      canConfigureSync: hasIntegrationAccess && canConfigureSync,
      canPushPull: hasIntegrationAccess && canPushPull,
      isLoading: stripeLoading || dbLoading || roleLoading,
      requiresUpgrade,
      upgradeMessage: requiresUpgrade
        ? "Jira integration is available on Pro and Enterprise plans. Upgrade to connect your Jira projects."
        : "",
    };
  }, [subscriptionStatus, dbSubscription, role, stripeLoading, dbLoading, roleLoading]);
}

// Helper to check if a specific integration feature is available
export function isFeatureAvailable(
  planId: string,
  feature: "jira" | "github" | "linear" | "github_actions"
): boolean {
  const proFeatures = ["jira", "github"];
  const enterpriseFeatures = ["jira", "github", "linear", "github_actions"];

  if (planId === "enterprise") {
    return enterpriseFeatures.includes(feature);
  }
  if (planId === "pro") {
    return proFeatures.includes(feature);
  }
  return false;
}
