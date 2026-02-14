import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Monitors for auth errors (401s from Supabase) and triggers session recovery.
 * Uses a global fetch interceptor to detect expired tokens.
 */
export function useSessionRecovery() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | undefined>();
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    // Store the user's email while we have a valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setLastEmail(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setLastEmail(session.user.email);
        setSessionExpired(false);
      }
      if (event === "SIGNED_OUT") {
        setSessionExpired(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Intercept fetch to detect 401s from our Supabase API
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;

    const originalFetch = window.fetch;
    originalFetchRef.current = originalFetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Only intercept 401s from our Supabase REST API (not auth endpoints)
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
      const isSupabaseApi = url.startsWith(supabaseUrl) && !url.includes("/auth/");
      
      if (response.status === 401 && isSupabaseApi) {
        // Verify the session is actually expired before showing dialog
        const { data: { session } } = await originalFetch(
          `${supabaseUrl}/auth/v1/session`,
          { method: "GET" }
        ).then(() => supabase.auth.getSession());

        if (!session) {
          setSessionExpired(true);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleRecovered = useCallback(() => {
    setSessionExpired(false);
  }, []);

  return {
    sessionExpired,
    lastEmail,
    handleRecovered,
  };
}
