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

export function useCreateCheckoutSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      priceId,
      planId,
    }: {
      workspaceId: string;
      priceId: string;
      planId: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("stripe-checkout", {
        body: {
          workspaceId,
          priceId,
          planId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
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

export function useCreatePortalSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("stripe-portal", {
        body: {
          workspaceId,
          returnUrl: `${window.location.origin}/billing`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
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
