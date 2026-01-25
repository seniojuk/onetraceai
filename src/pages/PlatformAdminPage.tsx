import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { JiraPlatformAdminPanel } from "@/components/integrations/jira/JiraPlatformAdminPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Settings2 } from "lucide-react";

const PlatformAdminPage = () => {
  const { data: isPlatformAdmin, isLoading } = usePlatformAdmin();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Platform Admin</h1>
            </div>
            <p className="text-muted-foreground">
              Platform-wide administration and oversight
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : !isPlatformAdmin ? (
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-destructive/50" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This page is only accessible to platform administrators. 
                  Contact your platform administrator if you need access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Jira Connections Overview */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Jira Integrations</h2>
                </div>
                <JiraPlatformAdminPanel />
              </section>

              <Separator />

              {/* Future: Workspace Overview */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Workspaces Overview</h2>
                </div>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base text-muted-foreground">Coming Soon</CardTitle>
                    <CardDescription>
                      Platform-wide workspace metrics and management tools will be available here.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </section>
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default PlatformAdminPage;