import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Play, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  GitBranch,
  TestTube2,
  ChevronRight,
  Plus,
  Copy,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts, useCreateArtifact } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GeneratedStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  priority: "high" | "medium" | "low";
  epic?: string;
}

interface AIRun {
  id: string;
  type: "STORY_GENERATION" | "AC_GENERATION" | "TEST_GENERATION" | "COVERAGE_ANALYSIS";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  inputArtifactId?: string;
  inputArtifactTitle?: string;
  outputCount: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  generatedStories?: GeneratedStory[];
}

// Mock AI runs
const mockRuns: AIRun[] = [
  {
    id: "1",
    type: "STORY_GENERATION",
    status: "COMPLETED",
    progress: 100,
    inputArtifactTitle: "User Authentication PRD",
    outputCount: 5,
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  },
  {
    id: "2",
    type: "AC_GENERATION",
    status: "RUNNING",
    progress: 65,
    inputArtifactTitle: "Payment Integration Epic",
    outputCount: 0,
    startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    type: "TEST_GENERATION",
    status: "FAILED",
    progress: 45,
    inputArtifactTitle: "Dashboard Views Story",
    outputCount: 0,
    startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    error: "Rate limit exceeded. Please try again later.",
  },
];

const AIRunsPage = () => {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: workspaces } = useWorkspaces();
  const createArtifact = useCreateArtifact();
  
  const [runs, setRuns] = useState<AIRun[]>(mockRuns);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArtifact, setSelectedArtifact] = useState<string>("");
  const [prdContent, setPrdContent] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [inputMode, setInputMode] = useState<"artifact" | "manual">("manual");
  const [selectedRun, setSelectedRun] = useState<AIRun | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [savingStories, setSavingStories] = useState<Record<number, boolean>>({});

  const runTypes = [
    { 
      value: "STORY_GENERATION", 
      label: "Generate Stories", 
      description: "Create user stories from a PRD or Epic",
      icon: FileText,
      inputTypes: ["PRD", "EPIC"],
    },
    { 
      value: "AC_GENERATION", 
      label: "Generate Acceptance Criteria", 
      description: "Create ACs from user stories",
      icon: GitBranch,
      inputTypes: ["STORY"],
    },
    { 
      value: "TEST_GENERATION", 
      label: "Generate Test Cases", 
      description: "Create test cases from ACs",
      icon: TestTube2,
      inputTypes: ["ACCEPTANCE_CRITERION"],
    },
  ];

  const handleStartRun = async () => {
    if (!selectedType) return;
    if (inputMode === "artifact" && !selectedArtifact) return;
    if (inputMode === "manual" && !prdContent.trim()) return;
    
    setIsStarting(true);
    
    const selectedArtifactData = artifacts?.find(a => a.id === selectedArtifact);
    const inputText = inputMode === "manual" 
      ? prdContent 
      : selectedArtifactData?.content_markdown || "";
    
    const newRun: AIRun = {
      id: String(Date.now()),
      type: selectedType as AIRun["type"],
      status: "RUNNING",
      progress: 10,
      inputArtifactId: inputMode === "artifact" ? selectedArtifact : undefined,
      inputArtifactTitle: inputMode === "artifact" ? selectedArtifactData?.title : "Manual PRD Input",
      outputCount: 0,
      startedAt: new Date().toISOString(),
    };
    
    setRuns([newRun, ...runs]);
    setIsDialogOpen(false);

    try {
      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prdContent: inputText,
            projectContext: customPrompt || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate stories");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const stories = data.stories || [];
      
      // Update the run with results
      setRuns(current => current.map(r => 
        r.id === newRun.id 
          ? { 
              ...r, 
              progress: 100,
              status: "COMPLETED" as const,
              outputCount: stories.length,
              completedAt: new Date().toISOString(),
              generatedStories: stories,
            }
          : r
      ));

      toast.success(`Generated ${stories.length} user stories`);
      
      // Show results dialog
      const completedRun = {
        ...newRun,
        progress: 100,
        status: "COMPLETED" as const,
        outputCount: stories.length,
        completedAt: new Date().toISOString(),
        generatedStories: stories,
      };
      setSelectedRun(completedRun);
      setIsResultsOpen(true);

    } catch (error) {
      console.error("Error generating stories:", error);
      
      setRuns(current => current.map(r => 
        r.id === newRun.id 
          ? { 
              ...r, 
              progress: 0,
              status: "FAILED" as const,
              completedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : "Unknown error",
            }
          : r
      ));

      toast.error(error instanceof Error ? error.message : "Failed to generate stories");
    } finally {
      setIsStarting(false);
      setSelectedType("");
      setSelectedArtifact("");
      setPrdContent("");
      setCustomPrompt("");
    }
  };

  const handleSaveStory = async (story: GeneratedStory, index: number) => {
    if (!currentProjectId || !currentWorkspaceId) {
      toast.error("Please select a project first");
      return;
    }

    setSavingStories(prev => ({ ...prev, [index]: true }));

    try {
      const contentMarkdown = `## Description\n${story.description}\n\n## Acceptance Criteria\n${story.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}\n\n## Story Points\n${story.storyPoints}\n\n## Priority\n${story.priority}`;
      
      await createArtifact.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        title: story.title,
        type: "STORY",
        contentMarkdown,
        contentJson: {
          storyPoints: story.storyPoints,
          priority: story.priority,
          acceptanceCriteria: story.acceptanceCriteria,
        },
      });

      toast.success(`Saved "${story.title}" as artifact`);
    } catch (error) {
      toast.error("Failed to save story");
    } finally {
      setSavingStories(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveAllStories = async () => {
    if (!currentProjectId || !selectedRun?.generatedStories) return;

    for (let i = 0; i < selectedRun.generatedStories.length; i++) {
      await handleSaveStory(selectedRun.generatedStories[i], i);
    }
  };

  const selectedTypeConfig = runTypes.find(t => t.value === selectedType);
  const eligibleArtifacts = artifacts?.filter(a => 
    selectedTypeConfig?.inputTypes.includes(a.type)
  ) || [];

  const statusColors = {
    PENDING: "bg-slate-100 text-slate-700",
    RUNNING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };

  const priorityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };

  const typeIcons = {
    STORY_GENERATION: FileText,
    AC_GENERATION: GitBranch,
    TEST_GENERATION: TestTube2,
    COVERAGE_ANALYSIS: Sparkles,
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Runs</h1>
              <p className="text-muted-foreground">
                Generate artifacts using AI-powered decomposition
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New AI Run
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Start AI Run</DialogTitle>
                  <DialogDescription>
                    Generate user stories from a PRD using AI
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Run Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select run type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {runTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTypeConfig && (
                      <p className="text-xs text-muted-foreground">{selectedTypeConfig.description}</p>
                    )}
                  </div>

                  {selectedType === "STORY_GENERATION" && (
                    <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "artifact" | "manual")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Paste PRD</TabsTrigger>
                        <TabsTrigger value="artifact">Select Artifact</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="manual" className="space-y-2 mt-4">
                        <Label>PRD Content</Label>
                        <Textarea
                          value={prdContent}
                          onChange={(e) => setPrdContent(e.target.value)}
                          placeholder="Paste your PRD content here...

Example:
# User Authentication System

## Overview
Build a secure authentication system that allows users to sign up, log in, and manage their accounts.

## Requirements
1. Email/password registration with validation
2. Social login (Google, GitHub)
3. Password reset functionality
4. Session management
5. Rate limiting for security"
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </TabsContent>
                      
                      <TabsContent value="artifact" className="space-y-2 mt-4">
                        <Label>Source Artifact</Label>
                        <Select value={selectedArtifact} onValueChange={setSelectedArtifact}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a PRD or Epic..." />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleArtifacts.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No PRDs or Epics found. Create one first or paste content manually.
                              </div>
                            ) : (
                              eligibleArtifacts.map(artifact => (
                                <SelectItem key={artifact.id} value={artifact.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {artifact.short_id}
                                    </span>
                                    <span className="truncate">{artifact.title}</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </TabsContent>
                    </Tabs>
                  )}

                  {selectedType && selectedType !== "STORY_GENERATION" && (
                    <div className="space-y-2">
                      <Label>Source Artifact</Label>
                      <Select value={selectedArtifact} onValueChange={setSelectedArtifact}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select artifact..." />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleArtifacts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No eligible artifacts found
                            </div>
                          ) : (
                            eligibleArtifacts.map(artifact => (
                              <SelectItem key={artifact.id} value={artifact.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {artifact.short_id}
                                  </span>
                                  <span className="truncate">{artifact.title}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Additional Context (optional)</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add project context, tech stack, or specific requirements..."
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartRun}
                    disabled={
                      !selectedType || 
                      isStarting || 
                      (selectedType === "STORY_GENERATION" && inputMode === "manual" && !prdContent.trim()) ||
                      (selectedType === "STORY_GENERATION" && inputMode === "artifact" && !selectedArtifact) ||
                      (selectedType !== "STORY_GENERATION" && !selectedArtifact)
                    }
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isStarting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isStarting ? "Generating..." : "Generate Stories"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {runTypes.map(type => (
              <Card 
                key={type.value}
                className="cursor-pointer card-hover"
                onClick={() => {
                  setSelectedType(type.value);
                  setIsDialogOpen(true);
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <type.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-1">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Run History */}
          <Card>
            <CardHeader>
              <CardTitle>Run History</CardTitle>
              <CardDescription>Recent AI generation runs</CardDescription>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No AI runs yet</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start First Run
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {runs.map(run => {
                    const TypeIcon = typeIcons[run.type];
                    return (
                      <div 
                        key={run.id} 
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border bg-card",
                          run.status === "COMPLETED" && run.generatedStories && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => {
                          if (run.status === "COMPLETED" && run.generatedStories) {
                            setSelectedRun(run);
                            setIsResultsOpen(true);
                          }
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <TypeIcon className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn(statusColors[run.status])}>
                              {run.status === "RUNNING" && (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              )}
                              {run.status}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {runTypes.find(t => t.value === run.type)?.label}
                            </span>
                          </div>
                          {run.inputArtifactTitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              From: {run.inputArtifactTitle}
                            </p>
                          )}
                          {run.status === "RUNNING" && (
                            <Progress value={run.progress} className="mt-2 h-1 [&>div]:bg-accent" />
                          )}
                          {run.error && (
                            <p className="text-sm text-destructive mt-1">{run.error}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {run.status === "COMPLETED" && (
                            <p className="text-sm font-medium text-green-600">
                              {run.outputCount} stories created
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(run.startedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Dialog */}
        <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Generated Stories
              </DialogTitle>
              <DialogDescription>
                {selectedRun?.outputCount} user stories generated from your PRD
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {selectedRun?.generatedStories?.map((story, index) => (
                  <Card key={index} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base">{story.title}</CardTitle>
                          {story.epic && (
                            <Badge variant="outline" className="mt-1">
                              {story.epic}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColors[story.priority]}>
                            {story.priority}
                          </Badge>
                          <Badge variant="secondary">
                            {story.storyPoints} pts
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{story.description}</p>
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Acceptance Criteria:</p>
                        <ul className="space-y-1">
                          {story.acceptanceCriteria.map((ac, acIndex) => (
                            <li key={acIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                              <span>{ac}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveStory(story, index)}
                          disabled={savingStories[index]}
                        >
                          {savingStories[index] ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save as Artifact
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsResultsOpen(false)}>
                Close
              </Button>
              <Button
                onClick={handleSaveAllStories}
                disabled={createArtifact.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save All as Artifacts
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </AuthGuard>
  );
};

export default AIRunsPage;
