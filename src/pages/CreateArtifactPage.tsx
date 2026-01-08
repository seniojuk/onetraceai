import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  FileText,
  Lightbulb,
  GitBranch,
  CheckCircle2,
  Bug,
  TestTube2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useCreateArtifact, ArtifactType } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRDGenerator } from "@/components/prd/PRDGenerator";

const artifactTypes: { value: ArtifactType; label: string; icon: React.ElementType; description: string; hasAI?: boolean }[] = [
  { value: "IDEA", label: "Idea", icon: Lightbulb, description: "Capture initial concepts and thoughts" },
  { value: "PRD", label: "PRD", icon: FileText, description: "Product Requirements Document", hasAI: true },
  { value: "EPIC", label: "Epic", icon: GitBranch, description: "Large body of work with multiple stories" },
  { value: "STORY", label: "Story", icon: FileText, description: "User story with acceptance criteria" },
  { value: "ACCEPTANCE_CRITERION", label: "Acceptance Criterion", icon: CheckCircle2, description: "Specific testable requirement" },
  { value: "TEST_CASE", label: "Test Case", icon: TestTube2, description: "Test to validate an AC" },
  { value: "BUG", label: "Bug", icon: Bug, description: "Issue or defect to track" },
  { value: "DECISION", label: "Decision", icon: FileText, description: "Architectural or design decision" },
];

const CreateArtifactPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const createArtifact = useCreateArtifact();

  const preselectedType = searchParams.get("type") as ArtifactType | null;
  
  const [type, setType] = useState<ArtifactType>(preselectedType || "STORY");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creationMode, setCreationMode] = useState<"manual" | "ai">(
    preselectedType === "PRD" ? "ai" : "manual"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentWorkspaceId || !currentProjectId) {
      toast({
        title: "Error",
        description: "Please select a workspace and project first.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the artifact.",
        variant: "destructive",
      });
      return;
    }

    try {
      const artifact = await createArtifact.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        type,
        title: title.trim(),
        contentMarkdown: content.trim() || undefined,
      });

      toast({
        title: "Artifact created",
        description: `${type} "${title}" has been created.`,
      });

      navigate(`/artifacts/${artifact.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create artifact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedType = artifactTypes.find(t => t.value === type);
  const showAIOption = selectedType?.hasAI;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate("/artifacts")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Create Artifact</h1>
          </div>

          <div className="space-y-6">
            {/* Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Artifact Type</CardTitle>
                <CardDescription>Select the type of artifact you want to create</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {artifactTypes.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setType(option.value);
                        if (option.hasAI) {
                          setCreationMode("ai");
                        } else {
                          setCreationMode("manual");
                        }
                      }}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border text-left transition-all relative",
                        type === option.value
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border hover:border-accent/50 hover:bg-muted/50"
                      )}
                    >
                      {option.hasAI && (
                        <div className="absolute top-2 right-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                        </div>
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        type === option.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI or Manual Mode Selection for PRD */}
            {showAIOption && (
              <Card>
                <CardHeader>
                  <CardTitle>Creation Method</CardTitle>
                  <CardDescription>Choose how you want to create your {selectedType?.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as "manual" | "ai")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="ai" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI-Assisted
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Manual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* AI Generator for PRD */}
            {type === "PRD" && creationMode === "ai" && (
              <PRDGenerator onComplete={(id) => navigate(`/artifacts/${id}`)} />
            )}

            {/* Manual Form */}
            {(creationMode === "manual" || !showAIOption) && (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Details</CardTitle>
                      <CardDescription>Add title and content for your {selectedType?.label}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={`Enter ${selectedType?.label} title...`}
                          className="text-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content">Content (optional)</Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Write your content here... (Markdown supported)"
                          className="min-h-[200px]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/artifacts")}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createArtifact.isPending || !title.trim()}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {createArtifact.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Create {selectedType?.label}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default CreateArtifactPage;
