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
  Plus
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
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

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
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  
  const [runs, setRuns] = useState<AIRun[]>(mockRuns);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedArtifact, setSelectedArtifact] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isStarting, setIsStarting] = useState(false);

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
    if (!selectedType || !selectedArtifact) return;
    
    setIsStarting(true);
    
    // Simulate starting a run
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const artifact = artifacts?.find(a => a.id === selectedArtifact);
    const newRun: AIRun = {
      id: String(Date.now()),
      type: selectedType as AIRun["type"],
      status: "RUNNING",
      progress: 0,
      inputArtifactId: selectedArtifact,
      inputArtifactTitle: artifact?.title,
      outputCount: 0,
      startedAt: new Date().toISOString(),
    };
    
    setRuns([newRun, ...runs]);
    setIsStarting(false);
    setIsDialogOpen(false);
    setSelectedType("");
    setSelectedArtifact("");
    setCustomPrompt("");

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setRuns(current => current.map(r => 
        r.id === newRun.id 
          ? { 
              ...r, 
              progress: Math.min(progress, 100),
              status: progress >= 100 ? "COMPLETED" : "RUNNING",
              outputCount: progress >= 100 ? Math.floor(Math.random() * 5) + 3 : 0,
              completedAt: progress >= 100 ? new Date().toISOString() : undefined,
            }
          : r
      ));
      if (progress >= 100) clearInterval(interval);
    }, 500);
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
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Start AI Run</DialogTitle>
                  <DialogDescription>
                    Select a run type and source artifact to generate new artifacts.
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

                  {selectedType && (
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
                    <Label>Additional Instructions (optional)</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add any specific requirements or context..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartRun}
                    disabled={!selectedType || !selectedArtifact || isStarting}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isStarting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Start Run
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
                      <div key={run.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
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
                            <p className="text-sm font-medium text-success">
                              {run.outputCount} artifacts created
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
      </AppLayout>
    </AuthGuard>
  );
};

export default AIRunsPage;
