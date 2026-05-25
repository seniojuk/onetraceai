import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MemberManagement } from "@/components/settings/MemberManagement";
import { useCurrentUserRole, useWorkspaces } from "@/hooks/useWorkspaces";
import { useUIStore } from "@/store/uiStore";

const TeamPage = () => {
  const { currentWorkspaceId } = useUIStore();
  const { data: workspaces, isLoading } = useWorkspaces();
  const userRole = useCurrentUserRole(currentWorkspaceId || undefined);

  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId);

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Team</h1>
              <p className="text-muted-foreground">
                Manage members of {currentWorkspace?.name || "your workspace"}
              </p>
            </div>
          </div>

          {currentWorkspaceId && currentWorkspace ? (
            <MemberManagement
              workspaceId={currentWorkspaceId}
              workspaceName={currentWorkspace.name}
              userRole={userRole}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>{isLoading ? "Loading workspace…" : "Select a workspace to manage team members."}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default TeamPage;
