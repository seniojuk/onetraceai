import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { JiraPlatformAdminPanel } from "@/components/integrations/jira/JiraPlatformAdminPanel";
import { PlatformAdminManagement } from "@/components/admin/PlatformAdminManagement";
import { WorkspaceMetricsPanel } from "@/components/admin/WorkspaceMetricsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Settings2, UserCog, BarChart3 } from "lucide-react";

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
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Usage Overview
                </TabsTrigger>
                <TabsTrigger value="admins" className="gap-2">
                  <UserCog className="w-4 h-4" />
                  Admin Management
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Integrations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <WorkspaceMetricsPanel />
              </TabsContent>

              <TabsContent value="admins" className="space-y-6">
                <PlatformAdminManagement />
              </TabsContent>

              <TabsContent value="integrations" className="space-y-6">
                <JiraPlatformAdminPanel />
                
                {/* Future: More integrations */}
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base text-muted-foreground">More Integrations Coming Soon</CardTitle>
                    <CardDescription>
                      Platform-wide integration management for additional services will be available here.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default PlatformAdminPage;