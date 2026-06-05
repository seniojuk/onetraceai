import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Network, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useCreateWorkspace, useWorkspaces } from "@/hooks/useWorkspaces";
import { useCreateProject } from "@/hooks/useProjects";
import { useCreateArtifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge, EdgeType } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { SeedPromptStep } from "@/components/onboarding/SeedPromptStep";
import { ChoosePathStep } from "@/components/onboarding/ChoosePathStep";
import { GuidedWizard } from "@/components/onboarding/GuidedWizard";
import { ACME_NOTES_DEMO } from "@/lib/demoProjectTemplate";

type Stage = "seed" | "workspace" | "path" | "wizard";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentWorkspaceId,
    setCurrentWorkspace,
    setCurrentProject,
    setShowOnboarding,
    onboardingSeed,
    setOnboardingSeed,
  } = useUIStore();

  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const createProject = useCreateProject();
  const createArtifact = useCreateArtifact();
  const createEdge = useCreateArtifactEdge();

  const stepParam = searchParams.get("step");
  const isAddingProjectOnly = stepParam === "create-project" && !!currentWorkspaceId;

  const [stage, setStage] = useState<Stage>(
    isAddingProjectOnly ? "path" : onboardingSeed ? "path" : "seed",
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(currentWorkspaceId);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [pathLoading, setPathLoading] = useState<"demo" | "real" | null>(null);

  // If a workspace already exists, sync the id
  useEffect(() => {
    if (currentWorkspaceId && !activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    } else if (!currentWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0].id);
      setCurrentWorkspace(workspaces[0].id);
    }
  }, [currentWorkspaceId, workspaces, activeWorkspaceId, setCurrentWorkspace]);

  const handleSeedContinue = (seed: string) => {
    setOnboardingSeed(seed);
    if (!activeWorkspaceId) {
      setStage("workspace");
    } else {
      setStage("path");
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name required");
      return;
    }
    try {
      const ws = await createWorkspace.mutateAsync({ name: workspaceName.trim() });
      setActiveWorkspaceId(ws.id);
      setCurrentWorkspace(ws.id);
      setStage("path");
    } catch (e: any) {
      toast.error(e.message || "Could not create workspace");
    }
  };

  const handleDemo = async () => {
    if (!activeWorkspaceId) return;
    setSeedingDemo(true);
    setPathLoading("demo");
    try {
      // Unique key per demo load — workspace+project_key has a UNIQUE constraint,
      // so we suffix with a short random token to avoid 409 on repeat loads.
      const uniqueSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const project = await createProject.mutateAsync({
        workspaceId: activeWorkspaceId,
        name: ACME_NOTES_DEMO.projectName,
        projectKey: `${ACME_NOTES_DEMO.projectKey}${uniqueSuffix}`,
        description: ACME_NOTES_DEMO.description,
      });
      setCurrentProject(project.id);

      // Seed artifacts in dependency order so parents exist before children
      const idByKey: Record<string, string> = {};
      for (const seed of ACME_NOTES_DEMO.artifacts) {
        const created = await createArtifact.mutateAsync({
          workspaceId: activeWorkspaceId,
          projectId: project.id,
          type: seed.type,
          title: seed.title,
          contentMarkdown: seed.markdown,
        });
        idByKey[seed.key] = created.id;
        if (seed.parentKey && idByKey[seed.parentKey]) {
          await createEdge.mutateAsync({
            workspaceId: activeWorkspaceId,
            projectId: project.id,
            fromArtifactId: idByKey[seed.parentKey],
            toArtifactId: created.id,
            edgeType: EdgeType.CONTAINS,
            // Must match artifact_edges_source_check allowed values
            source: "IMPORT",
          });
        }
      }

      setShowOnboarding(false);
      navigate("/graph?welcome=1");
    } catch (e: any) {
      toast.error(e.message || "Could not load demo");
      setPathLoading(null);
      setSeedingDemo(false);
    }
  };

  const handleReal = () => {
    setPathLoading("real");
    setStage("wizard");
  };

  if (loadingWorkspaces) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Network className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-semibold tracking-tight">OneTrace</span>
            </button>
            {stage !== "seed" && stage !== "wizard" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStage(stage === "path" ? (activeWorkspaceId ? "seed" : "workspace") : "seed")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          {stage === "seed" && (
            <SeedPromptStep initialValue={onboardingSeed} onContinue={handleSeedContinue} />
          )}

          {stage === "workspace" && (
            <div className="mx-auto w-full max-w-md animate-rise-in">
              <h1 className="font-display text-[36px] font-semibold leading-tight tracking-tight text-foreground sm:text-[44px]">
                Name your workspace.
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground">
                This is where your team will live. You can invite people later.
              </p>
              <div className="mt-8 space-y-3">
                <Label htmlFor="wsname">Workspace name</Label>
                <Input
                  id="wsname"
                  autoFocus
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="mt-8 flex justify-end">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleCreateWorkspace}
                  disabled={!workspaceName.trim() || createWorkspace.isPending}
                  className="animate-eye-pull"
                >
                  {createWorkspace.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create workspace
                </Button>
              </div>
            </div>
          )}

          {stage === "path" && (
            <ChoosePathStep
              onDemo={handleDemo}
              onReal={handleReal}
              isLoading={seedingDemo || pathLoading === "real"}
              loadingPath={pathLoading}
            />
          )}

          {stage === "wizard" && activeWorkspaceId && (
            <GuidedWizard
              workspaceId={activeWorkspaceId}
              seed={onboardingSeed}
              onExit={() => {
                setPathLoading(null);
                setStage("path");
              }}
            />
          )}
        </main>
      </div>
    </AuthGuard>
  );
};

export default OnboardingPage;
