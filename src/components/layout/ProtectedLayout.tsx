import { Outlet } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";

/**
 * Shared layout for all authenticated routes. Keeps the sidebar,
 * header, workspace/project switchers, and providers mounted across
 * navigations — only the <Outlet /> (page content) swaps.
 */
export function ProtectedLayout() {
  return (
    <AuthGuard>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthGuard>
  );
}
