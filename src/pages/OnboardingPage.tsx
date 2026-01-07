import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Network, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2,
  FolderPlus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useCreateProject } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";
import { useToast } from "@/hooks/use-toast";

type Step = "welcome" | "create-workspace" | "create-project" | "success";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [workspaceName, setWorkspaceName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  
  const { setCurrentWorkspace, setCurrentProject, setShowOnboarding } = useUIStore();
  const createWorkspace = useCreateWorkspace();
  const createProject = useCreateProject();

  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({ title: "Workspace name required", variant: "destructive" });
      return;
    }

    try {
      const workspace = await createWorkspace.mutateAsync({ name: workspaceName });
      setCreatedWorkspaceId(workspace.id);
      setCurrentWorkspace(workspace.id);
      setCurrentStep("create-project");
      toast({ title: "Workspace created!" });
    } catch (error: any) {
      toast({ title: "Error creating workspace", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectKey.trim() || !createdWorkspaceId) {
      toast({ title: "Project name and key required", variant: "destructive" });
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        workspaceId: createdWorkspaceId,
        name: projectName,
        projectKey: projectKey,
        description: projectDescription,
      });
      setCurrentProject(project.id);
      setCurrentStep("success");
      toast({ title: "Project created!" });
    } catch (error: any) {
      toast({ title: "Error creating project", description: error.message, variant: "destructive" });
    }
  };

  const handleComplete = () => {
    setShowOnboarding(false);
    navigate("/dashboard");
  };

  const steps = [
    { id: "welcome", label: "Welcome" },
    { id: "create-workspace", label: "Workspace" },
    { id: "create-project", label: "Project" },
    { id: "success", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">OneTrace AI</span>
          </div>
        </header>

        {/* Progress */}
        <div className="border-b border-border py-4 px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                    i < currentStepIndex 
                      ? 'bg-success border-success text-white' 
                      : i === currentStepIndex 
                        ? 'border-accent bg-accent text-white' 
                        : 'border-muted-foreground/30'
                  }`}>
                    {i < currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="hidden sm:block text-sm">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-success' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            {currentStep === "welcome" && (
              <>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Let's make your AI builds traceable</CardTitle>
                  <CardDescription>
                    Set up your workspace in minutes. Connect Jira + Git and generate your first traceable stories.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {[
                      "Create your workspace",
                      "Set up your first project",
                      "Connect integrations (optional)",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                          {i + 1}
                        </div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" onClick={() => setCurrentStep("create-workspace")}>
                    Start Setup
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}

            {currentStep === "create-workspace" && (
              <>
                <CardHeader>
                  <CardTitle>Create your workspace</CardTitle>
                  <CardDescription>
                    A workspace is where your team collaborates. You can invite others later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace name</Label>
                    <Input
                      id="workspaceName"
                      placeholder="e.g., Acme Corp"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep("welcome")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleCreateWorkspace}
                      disabled={createWorkspace.isPending}
                    >
                      {createWorkspace.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FolderPlus className="w-4 h-4 mr-2" />
                      )}
                      Create Workspace
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {currentStep === "create-project" && (
              <>
                <CardHeader>
                  <CardTitle>Create your first project</CardTitle>
                  <CardDescription>
                    Projects contain your PRDs, stories, and traceability data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project name</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g., Mobile App v2"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectKey">Project key</Label>
                    <Input
                      id="projectKey"
                      placeholder="e.g., MOBILE"
                      value={projectKey}
                      onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">Used in artifact IDs like MOBILE-STORY-0001</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Description (optional)</Label>
                    <Textarea
                      id="projectDescription"
                      placeholder="What is this project about?"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep("create-workspace")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleCreateProject}
                      disabled={createProject.isPending}
                    >
                      {createProject.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Create Project
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {currentStep === "success" && (
              <>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <CardTitle className="text-2xl">You're all set!</CardTitle>
                  <CardDescription>
                    Your workspace and project are ready. Start creating traceable artifacts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={handleComplete}>
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default OnboardingPage;
