import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "./usePlatformAdmin";
import { toast } from "sonner";

export interface PlatformAdminInfo {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  granted_by: string | null;
  granted_by_name: string | null;
  granted_by_email: string | null;
  granted_at: string | null;
  created_at: string;
}

export function usePlatformAdminList() {
  const { data: isPlatformAdmin } = usePlatformAdmin();

  return useQuery({
    queryKey: ["platform-admin-list"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("manage-platform-admins", {
        body: { action: "list" },
      });

      if (error) {
        console.error("Error fetching platform admins:", error);
        throw error;
      }

      return data.admins as PlatformAdminInfo[];
    },
    enabled: isPlatformAdmin === true,
  });
}

export function useAddPlatformAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userEmail: string) => {
      const { data, error } = await supabase.functions.invoke("manage-platform-admins", {
        body: { action: "add", user_email: userEmail },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-list"] });
      toast.success("Platform admin added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add platform admin");
    },
  });
}

export function useRemovePlatformAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-platform-admins", {
        body: { action: "remove", user_id: userId },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-list"] });
      toast.success("Platform admin removed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove platform admin");
    },
  });
}
