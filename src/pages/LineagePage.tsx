import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArtifactLineageView } from "@/components/lineage/ArtifactLineageView";
import { useUIStore } from "@/store/uiStore";
import { GitBranch } from "lucide-react";

export default function LineagePage() {
  const { currentProjectId, currentWorkspaceId } = useUIStore();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="w-6 h-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Artifact Lineage</h1>
              </div>
              <p className="text-muted-foreground">
                Visual traceability showing which pipeline runs generated which artifacts
              </p>
            </div>
          </div>

          {/* Lineage View */}
          <ArtifactLineageView
            projectId={currentProjectId || undefined}
            workspaceId={currentWorkspaceId || undefined}
          />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
