import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  GitBranch, 
  Link2,
  Clock,
  User,
  Save,
  X,
  Plus,
  Loader2,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  TestTube2,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifact, useUpdateArtifact, useArtifacts, ArtifactStatus, Artifact } from "@/hooks/useArtifacts";
import { useArtifactEdges } from "@/hooks/useArtifactEdges";
import { usePipelineRunForArtifact } from "@/hooks/useArtifactLineage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRDEnhancer } from "@/components/prd/PRDEnhancer";
import { PRDVersionHistory } from "@/components/prd/PRDVersionHistory";
import { AttachedFiles } from "@/components/files/AttachedFiles";

const statusOptions: { value: ArtifactStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
  { value: "ARCHIVED", label: "Archived" },
];

const ArtifactDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: artifact, isLoading } = useArtifact(id);
  const updateArtifact = useUpdateArtifact();
  const { data: edges, isLoading: edgesLoading } = useArtifactEdges(id);
  const { data: allArtifacts } = useArtifacts(artifact?.project_id);
  const { data: pipelineRun } = usePipelineRunForArtifact(id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedStatus, setEditedStatus] = useState<ArtifactStatus>("DRAFT");

  // Compute linked artifacts from edges
  const linkedArtifacts = useMemo(() => {
    if (!edges || !allArtifacts) return { parents: [] as Array<{ artifact: Artifact; edgeType: string; source: string }>, children: [] as Array<{ artifact: Artifact; edgeType: string; source: string }> };
    
    const artifactMap = new Map(allArtifacts.map(a => [a.id, a]));
    
    // Parents: artifacts that point TO this artifact (incoming edges)
    const parents = edges.incoming
      .map(edge => {
        const artifact = artifactMap.get(edge.from_artifact_id);
        if (!artifact) return null;
        return {
          artifact,
          edgeType: edge.edge_type as string,
          source: edge.source,
        };
      })
      .filter((item): item is { artifact: Artifact; edgeType: string; source: string } => item !== null);
    
    // Children: artifacts that this artifact points TO (outgoing edges)
    const children = edges.outgoing
      .map(edge => {
        const artifact = artifactMap.get(edge.to_artifact_id);
        if (!artifact) return null;
        return {
          artifact,
          edgeType: edge.edge_type as string,
          source: edge.source,
        };
      })
      .filter((item): item is { artifact: Artifact; edgeType: string; source: string } => item !== null);
    
    return { parents, children };
  }, [edges, allArtifacts]);

  const handleEdit = () => {
    if (artifact) {
      setEditedTitle(artifact.title);
      setEditedContent(artifact.content_markdown || "");
      setEditedStatus(artifact.status);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!artifact) return;
    
    try {
      await updateArtifact.mutateAsync({
        id: artifact.id,
        title: editedTitle,
        status: editedStatus,
        contentMarkdown: editedContent,
      });
      
      toast({
        title: "Artifact updated",
        description: "Your changes have been saved.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    if (!artifact) return;
    
    try {
      await updateArtifact.mutateAsync({
        id: artifact.id,
        status: "ARCHIVED",
      });
      
      toast({
        title: "Artifact archived",
        description: "The artifact has been archived.",
      });
      
      navigate("/artifacts");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive artifact. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  if (!artifact) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h2 className="text-xl font-semibold text-foreground mb-2">Artifact not found</h2>
            <p className="text-muted-foreground mb-4">The artifact you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/artifacts")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Artifacts
            </Button>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  const statusColor = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    BLOCKED: "bg-red-100 text-red-700",
    DONE: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-700",
  };

  const typeIcons: Record<string, typeof FileText> = {
    IDEA: Lightbulb,
    PRD: FileText,
    EPIC: FileText,
    STORY: FileText,
    ACCEPTANCE_CRITERION: CheckCircle2,
    TEST_CASE: TestTube2,
  };

  const canGeneratePRD = artifact.type === "IDEA";
  const canGenerateStories = artifact.type === "PRD";
  const canEnhancePRD = artifact.type === "PRD";

  const edgeTypeLabels: Record<string, string> = {
    DERIVES_FROM: "Derived from",
    IMPLEMENTS: "Implements",
    TESTS: "Tests",
    BLOCKS: "Blocks",
    RELATES_TO: "Related to",
    PARENT_OF: "Parent of",
    CHILD_OF: "Child of",
  };

  const hasLinkedArtifacts = linkedArtifacts.parents.length > 0 || linkedArtifacts.children.length > 0;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/artifacts")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="font-mono text-sm text-muted-foreground">{artifact.short_id}</span>
            <Badge className={cn(statusColor[artifact.status as ArtifactStatus])}>
              {artifact.status}
            </Badge>
          </div>

          {/* Title & Actions */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold h-auto py-2"
                  placeholder="Artifact title"
                />
              ) : (
                <h1 className="text-3xl font-bold text-foreground">{artifact.title}</h1>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Updated {new Date(artifact.updated_at).toLocaleDateString()}
                </span>
                {artifact.created_by && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Created by you
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updateArtifact.isPending} className="bg-accent hover:bg-accent/90">
                    {updateArtifact.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  {canGeneratePRD && (
                    <Button 
                      onClick={() => navigate(`/artifacts/new?type=PRD&fromIdea=${artifact.id}`)}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate PRD
                    </Button>
                  )}
                  {canGenerateStories && (
                    <Button 
                      onClick={() => navigate(`/artifacts/new?type=STORY&fromPRD=${artifact.id}`)}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Stories
                    </Button>
                  )}
                  {canEnhancePRD && (
                    <Button 
                      onClick={() => setIsEnhancing(true)}
                      variant="outline"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Enhance PRD
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canGeneratePRD && (
                        <>
                          <DropdownMenuItem onClick={() => navigate(`/artifacts/new?type=PRD&fromIdea=${artifact.id}`)}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate PRD from Idea
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {canGenerateStories && (
                        <>
                          <DropdownMenuItem onClick={() => navigate(`/artifacts/new?type=STORY&fromPRD=${artifact.id}`)}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Stories from PRD
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsEnhancing(true)}>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Enhance PRD
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => navigate(`/graph?focus=${artifact.id}`)}>
                        <GitBranch className="w-4 h-4 mr-2" />
                        View in Graph
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link2 className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive artifact?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will archive the artifact. You can restore it later from the archive.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* PRD Enhancer */}
              {isEnhancing && artifact.type === "PRD" && (
                <PRDEnhancer
                  artifact={artifact}
                  onComplete={() => setIsEnhancing(false)}
                  onCancel={() => setIsEnhancing(false)}
                />
              )}
              {/* Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>Artifact description and details</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Write your artifact content here... (Markdown supported)"
                      className="min-h-[300px] font-mono text-sm"
                    />
                  ) : artifact.content_markdown ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans">{artifact.content_markdown}</pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No content yet. Click Edit to add content.</p>
                  )}
                </CardContent>
              </Card>

              {/* Attached Files */}
              <AttachedFiles
                artifactId={artifact.id}
                projectId={artifact.project_id}
                workspaceId={artifact.workspace_id}
                isEditing={isEditing}
              />

              {/* Related Artifacts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Related Artifacts</CardTitle>
                    <CardDescription>Connected through the artifact graph</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/graph?focus=${artifact.id}`)}>
                    <GitBranch className="w-4 h-4 mr-2" />
                    View Graph
                  </Button>
                </CardHeader>
                <CardContent>
                  {edgesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !hasLinkedArtifacts ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No related artifacts yet
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Parent Artifacts (derived from) */}
                      {linkedArtifacts.parents.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Derived From</span>
                          </div>
                          <div className="space-y-2">
                            {linkedArtifacts.parents.map(({ artifact: parent, edgeType, source }) => {
                              const Icon = typeIcons[parent.type] || FileText;
                              return (
                                <div
                                  key={parent.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => navigate(`/artifacts/${parent.id}`)}
                                >
                                  <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-accent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">{parent.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-mono text-muted-foreground">{parent.short_id}</span>
                                      <Badge variant="outline" className="text-xs">{parent.type.replace("_", " ")}</Badge>
                                      {source === "AI_GENERATED" && (
                                        <Badge variant="secondary" className="text-xs">AI</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Child Artifacts (generates) */}
                      {linkedArtifacts.children.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Generated Artifacts</span>
                          </div>
                          <div className="space-y-2">
                            {linkedArtifacts.children.map(({ artifact: child, edgeType, source }) => {
                              const Icon = typeIcons[child.type] || FileText;
                              return (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => navigate(`/artifacts/${child.id}`)}
                                >
                                  <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-accent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">{child.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-mono text-muted-foreground">{child.short_id}</span>
                                      <Badge variant="outline" className="text-xs">{child.type.replace("_", " ")}</Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {edgeTypeLabels[edgeType] || edgeType}
                                      </Badge>
                                      {source === "AI_GENERATED" && (
                                        <Badge variant="secondary" className="text-xs">AI</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* PRD Version History */}
              {artifact.type === "PRD" && (
                <PRDVersionHistory artifactId={artifact.id} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Status</label>
                    {isEditing ? (
                      <Select value={editedStatus} onValueChange={(v) => setEditedStatus(v as ArtifactStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={cn(statusColor[artifact.status as ArtifactStatus])}>
                        {artifact.status}
                      </Badge>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Type</label>
                    <p className="text-foreground">{artifact.type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">ID</label>
                    <p className="font-mono text-sm text-foreground">{artifact.short_id}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Created</label>
                    <p className="text-sm text-foreground">{new Date(artifact.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Last Updated</label>
                    <p className="text-sm text-foreground">{new Date(artifact.updated_at).toLocaleString()}</p>
                  </div>

                  {/* Pipeline Source */}
                  {pipelineRun && (
                    <>
                      <Separator />
                      <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <div className="flex items-center gap-2 text-sm font-medium text-accent mb-2">
                          <GitBranch className="w-4 h-4" />
                          Pipeline Generated
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium">Pipeline:</span> {pipelineRun.pipeline?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          <span className="font-medium">Run:</span> {new Date(pipelineRun.created_at).toLocaleString()}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => navigate("/lineage")}
                        >
                          View Lineage
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tags</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {artifact.tags && artifact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {artifact.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No tags</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default ArtifactDetailPage;
