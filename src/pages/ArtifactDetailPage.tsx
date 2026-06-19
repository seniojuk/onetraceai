import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
import { useArtifactEdges, useDeleteArtifactEdge, useCreateArtifactEdge } from "@/hooks/useArtifactEdges";
import { LinkArtifactDialog } from "@/components/artifacts/LinkArtifactDialog";
import { linkRules } from "@/lib/artifactLinking";
import { toast as sonner } from "sonner";
import { usePipelineRunForArtifact } from "@/hooks/useArtifactLineage";
import { useJiraIssueMapping } from "@/hooks/useJiraIssueMapping";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRDEnhancer } from "@/components/prd/PRDEnhancer";
import { PRDVersionHistory } from "@/components/prd/PRDVersionHistory";
import { AttachedFiles } from "@/components/files/AttachedFiles";
import { IdeaEnhancer } from "@/components/idea/IdeaEnhancer";
import { JiraIssueBadge, JiraIssueSidebarCard } from "@/components/integrations/jira/JiraIssueBadge";
import { PromptGeneratorDialog } from "@/components/prompts/PromptGeneratorDialog";
import { PromptHistorySection } from "@/components/prompts/PromptHistorySection";

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
  const { data: jiraMapping } = useJiraIssueMapping(id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPromptGenOpen, setIsPromptGenOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedStatus, setEditedStatus] = useState<ArtifactStatus>("DRAFT");

  const deleteEdge = useDeleteArtifactEdge();
  const createEdge = useCreateArtifactEdge();

  const handleUnlinkEdge = async (
    edgeId: string,
    snapshot: { fromId: string; toId: string; edgeType: string; source: string },
    parentLabel: string,
  ) => {
    if (!artifact) return;
    try {
      await deleteEdge.mutateAsync({ edgeId, projectId: artifact.project_id });
      sonner.success(`Unlinked ${parentLabel}`, {
        action: {
          label: "Undo",
          onClick: () => {
            createEdge.mutate({
              workspaceId: artifact.workspace_id,
              projectId: artifact.project_id,
              fromArtifactId: snapshot.fromId,
              toArtifactId: snapshot.toId,
              edgeType: snapshot.edgeType as any,
              source: snapshot.source || "MANUAL",
            });
          },
        },
      });
    } catch (e) {
      sonner.error("Could not unlink");
    }
  };

  // Compute linked artifacts from edges (carry edge id so we can unlink)
  type LinkedItem = { artifact: Artifact; edgeId: string; edgeType: string; source: string; fromId: string; toId: string };
  const linkedArtifacts = useMemo(() => {
    if (!edges || !allArtifacts) return { parents: [] as LinkedItem[], children: [] as LinkedItem[] };

    const artifactMap = new Map(allArtifacts.map(a => [a.id, a]));

    const parents: LinkedItem[] = edges.incoming
      .map(edge => {
        const a = artifactMap.get(edge.from_artifact_id);
        if (!a) return null;
        return { artifact: a, edgeId: edge.id, edgeType: edge.edge_type as string, source: edge.source, fromId: edge.from_artifact_id, toId: edge.to_artifact_id };
      })
      .filter((x): x is LinkedItem => x !== null);

    const children: LinkedItem[] = edges.outgoing
      .map(edge => {
        const a = artifactMap.get(edge.to_artifact_id);
        if (!a) return null;
        return { artifact: a, edgeId: edge.id, edgeType: edge.edge_type as string, source: edge.source, fromId: edge.from_artifact_id, toId: edge.to_artifact_id };
      })
      .filter((x): x is LinkedItem => x !== null);

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

  const statusColor: Record<ArtifactStatus, string> = {
    DRAFT: "bg-muted text-muted-foreground border-border",
    ACTIVE: "bg-accent/10 text-accent border-accent/20",
    IN_PROGRESS: "bg-warning/10 text-warning border-warning/20",
    BLOCKED: "bg-destructive/10 text-destructive border-destructive/20",
    DONE: "bg-success/10 text-success border-success/20",
    ARCHIVED: "bg-muted text-muted-foreground border-border",
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
  const canGenerateEpics = artifact.type === "PRD";
  const canGenerateStories = artifact.type === "PRD";
  const canGenerateStoriesFromEpic = artifact.type === "EPIC";
  const canEnhancePRD = artifact.type === "PRD";
  const canEnhanceIdea = artifact.type === "IDEA";

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

  // Resolve a single primary action per artifact type — everything else
  // lives in the overflow menu to keep the action bar uncluttered.
  const TypeIcon = typeIcons[artifact.type] || FileText;
  type PrimaryAction = { label: string; icon: typeof FileText; onClick: () => void } | null;
  const primaryAction: PrimaryAction = canGeneratePRD
    ? { label: "Generate PRD", icon: Sparkles, onClick: () => navigate(`/artifacts/new?type=PRD&fromIdea=${artifact.id}`) }
    : canGenerateEpics
      ? { label: "Generate Epics", icon: Sparkles, onClick: () => navigate(`/artifacts/new?type=EPIC&fromPRD=${artifact.id}`) }
      : canGenerateStoriesFromEpic
        ? { label: "Generate Stories", icon: Sparkles, onClick: () => navigate(`/artifacts/new?type=STORY&fromEpic=${artifact.id}`) }
        : null;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="px-8 py-8 max-w-[1400px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <button
              type="button"
              onClick={() => navigate("/artifacts")}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Artifacts
            </button>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-mono text-foreground/70">{artifact.short_id}</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-6 pb-6 mb-8 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <TypeIcon className="w-3.5 h-3.5" />
                  {artifact.type.replace("_", " ")}
                </span>
                <span className={cn(
                  "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  statusColor[artifact.status as ArtifactStatus],
                )}>
                  {artifact.status.replace("_", " ")}
                </span>
                {jiraMapping && <JiraIssueBadge mapping={jiraMapping} />}
              </div>

              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="font-display text-3xl font-semibold tracking-tight h-auto py-2 border-dashed"
                  placeholder="Artifact title"
                />
              ) : (
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground leading-tight">
                  {artifact.title}
                </h1>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Updated {new Date(artifact.updated_at).toLocaleDateString()}
                </span>
                {artifact.created_by && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Created by you
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-[0.625rem]">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button variant="accent"
                    onClick={handleSave}
                    disabled={updateArtifact.isPending}
                    className="rounded-[0.625rem]"
                  >
                    {updateArtifact.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save changes
                  </Button>
                </>
              ) : (
                <>
                  {primaryAction && (
                    <Button variant="accent"
                      onClick={primaryAction.onClick}
                      className="rounded-[0.625rem]"
                    >
                      <primaryAction.icon className="w-4 h-4 mr-2" />
                      {primaryAction.label}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleEdit} className="rounded-[0.625rem]">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-[0.625rem]">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {canEnhanceIdea && (
                        <DropdownMenuItem onClick={() => setIsEnhancing(true)}>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Enhance Idea
                        </DropdownMenuItem>
                      )}
                      {canEnhancePRD && (
                        <DropdownMenuItem onClick={() => setIsEnhancing(true)}>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Enhance PRD
                        </DropdownMenuItem>
                      )}
                      {canGenerateStories && (
                        <DropdownMenuItem onClick={() => navigate(`/artifacts/new?type=STORY&fromPRD=${artifact.id}`)}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Stories from PRD
                        </DropdownMenuItem>
                      )}
                      {linkRules[artifact.type] && (
                        <DropdownMenuItem onClick={() => setIsLinkOpen(true)}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Link artifact
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => navigate(`/graph?focus=${artifact.id}`)}>
                        <GitBranch className="w-4 h-4 mr-2" />
                        View in Graph
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsPromptGenOpen(true)}>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Code Prompt
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          sonner.success("Link copied");
                        }}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
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

          {/* Editor + Inspector grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Enhancers */}
              {isEnhancing && artifact.type === "PRD" && (
                <PRDEnhancer
                  artifact={artifact}
                  onComplete={() => setIsEnhancing(false)}
                  onCancel={() => setIsEnhancing(false)}
                />
              )}
              {isEnhancing && artifact.type === "IDEA" && (
                <IdeaEnhancer
                  artifact={artifact}
                  onComplete={() => setIsEnhancing(false)}
                  onCancel={() => setIsEnhancing(false)}
                />
              )}

              {/* Content */}
              <section className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <header className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Content
                    </h2>
                  </div>
                  {!isEditing && artifact.content_markdown && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {artifact.content_markdown.length.toLocaleString()} chars
                    </span>
                  )}
                </header>
                <div className="p-5">
                  {isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Write your artifact content here… (Markdown supported)"
                      className="min-h-[360px] font-mono text-sm bg-background"
                    />
                  ) : artifact.content_markdown ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-a:text-primary">
                      <ReactMarkdown>{artifact.content_markdown}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                      <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">No content yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Add a description so collaborators have context.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleEdit} className="rounded-[0.625rem]">
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Add content
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Attached Files */}
              <AttachedFiles
                artifactId={artifact.id}
                projectId={artifact.project_id}
                workspaceId={artifact.workspace_id}
                isEditing={isEditing}
              />

              {/* Related Artifacts */}
              <section className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <header className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Related artifacts
                    </h2>
                    {hasLinkedArtifacts && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        · {linkedArtifacts.parents.length + linkedArtifacts.children.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {linkRules[artifact.type] && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsLinkOpen(true)}>
                        <Link2 className="w-3.5 h-3.5 mr-1" />
                        Link
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate(`/graph?focus=${artifact.id}`)}
                    >
                      <GitBranch className="w-3.5 h-3.5 mr-1" />
                      Graph
                    </Button>
                  </div>
                </header>
                <div className="p-5">
                  {edgesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !hasLinkedArtifacts ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <p className="text-sm text-muted-foreground">Nothing linked yet</p>
                      {linkRules[artifact.type] && (
                        <Button variant="outline" size="sm" className="rounded-[0.625rem]" onClick={() => setIsLinkOpen(true)}>
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          Link a parent
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {linkedArtifacts.parents.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Derived from
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {linkedArtifacts.parents.map(({ artifact: parent, edgeId, edgeType, source, fromId, toId }) => {
                              const Icon = typeIcons[parent.type] || FileText;
                              return (
                                <div
                                  key={edgeId}
                                  className="group flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/40 cursor-pointer transition-colors"
                                  onClick={() => navigate(`/artifacts/${parent.id}`)}
                                >
                                  <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-accent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{parent.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-mono text-muted-foreground">{parent.short_id}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {edgeTypeLabels[edgeType] || edgeType.replace("_", " ").toLowerCase()}
                                      </span>
                                      {source === "AI_GENERATED" && (
                                        <span className="text-[10px] font-medium text-accent">AI</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    aria-label="Unlink"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlinkEdge(edgeId, { fromId, toId, edgeType, source }, parent.short_id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {linkedArtifacts.children.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Generated artifacts
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {linkedArtifacts.children.map(({ artifact: child, edgeId, edgeType, source, fromId, toId }) => {
                              const Icon = typeIcons[child.type] || FileText;
                              return (
                                <div
                                  key={edgeId}
                                  className="group flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/40 cursor-pointer transition-colors"
                                  onClick={() => navigate(`/artifacts/${child.id}`)}
                                >
                                  <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-accent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{child.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-mono text-muted-foreground">{child.short_id}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {edgeTypeLabels[edgeType] || edgeType.replace("_", " ").toLowerCase()}
                                      </span>
                                      {source === "AI_GENERATED" && (
                                        <span className="text-[10px] font-medium text-accent">AI</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    aria-label="Unlink"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlinkEdge(edgeId, { fromId, toId, edgeType, source }, child.short_id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Version History */}
              {(artifact.type === "PRD" || artifact.type === "IDEA") && (
                <PRDVersionHistory artifactId={artifact.id} />
              )}
            </div>

            {/* Inspector column */}
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Properties */}
              <section className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <header className="px-5 py-3 border-b border-border">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Properties
                  </h2>
                </header>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Status
                    </label>
                    {isEditing ? (
                      <Select value={editedStatus} onValueChange={(v) => setEditedStatus(v as ArtifactStatus)}>
                        <SelectTrigger className="rounded-[0.5rem]">
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
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        statusColor[artifact.status as ArtifactStatus],
                      )}>
                        {artifact.status.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Type</div>
                      <div className="text-sm text-foreground mt-0.5">{artifact.type.replace("_", " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID</div>
                      <div className="text-sm font-mono text-foreground mt-0.5 truncate">{artifact.short_id}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Parents</div>
                      <div className="text-sm text-foreground mt-0.5 tabular-nums">{linkedArtifacts.parents.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Children</div>
                      <div className="text-sm text-foreground mt-0.5 tabular-nums">{linkedArtifacts.children.length}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-foreground tabular-nums">{new Date(artifact.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="text-foreground tabular-nums">{new Date(artifact.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {pipelineRun && (
                    <div className="pt-3 border-t border-border">
                      <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">
                          <GitBranch className="w-3.5 h-3.5" />
                          Pipeline generated
                        </div>
                        <p className="text-xs text-foreground/80 mb-0.5 truncate">
                          {pipelineRun.pipeline?.name || "Unknown"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          {new Date(pipelineRun.created_at).toLocaleString()}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7 rounded-[0.5rem]"
                          onClick={() => navigate("/lineage")}
                        >
                          View Lineage
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Tags */}
              <section className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <header className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </h2>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </header>
                <div className="p-5">
                  {artifact.tags && artifact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {artifact.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No tags</p>
                  )}
                </div>
              </section>

              {/* Jira Integration */}
              {jiraMapping && (
                <JiraIssueSidebarCard
                  mapping={jiraMapping}
                  artifactShortId={artifact.short_id}
                />
              )}

              {/* Code Generation */}
              <section className="bg-card rounded-[0.625rem] border border-border overflow-hidden">
                <header className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Code generation
                  </h2>
                </header>
                <div className="p-5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-[0.5rem]"
                    onClick={() => setIsPromptGenOpen(true)}
                  >
                    <Wand2 className="w-3.5 h-3.5 mr-2" />
                    Generate prompt
                  </Button>
                  <PromptHistorySection artifactId={artifact.id} />
                </div>
              </section>
            </aside>
          </div>
        </div>

        {/* Prompt Generator Dialog */}
        <PromptGeneratorDialog
          open={isPromptGenOpen}
          onOpenChange={setIsPromptGenOpen}
          artifact={artifact}
        />

        {/* Link Artifact Dialog */}
        <LinkArtifactDialog
          open={isLinkOpen}
          onOpenChange={setIsLinkOpen}
          artifact={artifact}
        />

      </AppLayout>
    </AuthGuard>
  );
};

export default ArtifactDetailPage;
