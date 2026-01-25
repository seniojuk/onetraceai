import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Subscription {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  subscribed: boolean;
  plan_id: string;
  product_id: string | null;
  subscription_end: string | null;
}

export interface PlanLimit {
  id: string;
  plan_id: string;
  plan_name: string;
  price_monthly: number;
  max_workspaces: number | null;
  max_projects: number | null;
  max_artifacts: number | null;
  max_ai_runs_per_month: number | null;
  max_storage_mb: number | null;
  features: string[];
}

export interface Invoice {
  id: string;
  workspace_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

// Check subscription status directly from Stripe
export function useCheckSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const response = await supabase.functions.invoke("check-subscription");
      
      if (response.error) {
        console.error("Check subscription error:", response.error);
        return { subscribed: false, plan_id: "free", product_id: null, subscription_end: null };
      }
      
      return response.data as SubscriptionStatus;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

export function useSubscription(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user && !!workspaceId,
  });
}

export function usePlanLimits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      return data as PlanLimit[];
    },
    enabled: !!user,
  });
}

export function useInvoices(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateCheckout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      workspaceId,
    }: {
      planId: string;
      workspaceId: string;
    }) => {
      const response = await supabase.functions.invoke("create-checkout", {
        body: {
          planId,
          workspaceId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        // Use location.href instead of window.open to avoid popup blockers
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCustomerPortal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (returnUrl?: string) => {
      const response = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: returnUrl || `${window.location.origin}/billing` },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        // Use location.href instead of window.open to avoid popup blockers
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Portal Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Legacy exports for compatibility
export const useCreateCheckoutSession = useCreateCheckout;
export const useCreatePortalSession = useCustomerPortal;
