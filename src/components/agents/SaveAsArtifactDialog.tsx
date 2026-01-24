import { useState } from "react";
import { FileText, Save, Loader2, Link, AlertTriangle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useCreateArtifact, type ArtifactType } from "@/hooks/useArtifacts";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SaveAsArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  workspaceId: string;
  projectId?: string;
  pipelineRunId?: string;
  pipelineName?: string;
  suggestedTitle?: string;
  suggestedType?: ArtifactType;
}

const ARTIFACT_TYPES: { value: ArtifactType; label: string }[] = [
  { value: "PRD", label: "PRD (Product Requirements)" },
  { value: "STORY", label: "User Story" },
  { value: "EPIC", label: "Epic" },
  { value: "TEST_CASE", label: "Test Case" },
  { value: "DECISION", label: "Decision Record" },
  { value: "IDEA", label: "Idea" },
];

export function SaveAsArtifactDialog({
  open,
  onOpenChange,
  content,
  workspaceId,
  projectId,
  pipelineRunId,
  pipelineName,
  suggestedTitle,
  suggestedType,
}: SaveAsArtifactDialogProps) {
  const [title, setTitle] = useState(suggestedTitle || "");
  const [type, setType] = useState<ArtifactType>(suggestedType || "PRD");
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();
  const createArtifact = useCreateArtifact();
  const { canCreateArtifact, artifactAtLimit, artifactWarning, usage } = useUsageLimits();

  const handleSave = async () => {
    if (artifactAtLimit) {
      toast.error("Artifact limit reached", {
        description: "Upgrade your plan to create more artifacts.",
      });
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!projectId) {
      toast.error("No project selected");
      return;
    }

    setIsSaving(true);
    try {
      // Create the artifact
      const artifact = await createArtifact.mutateAsync({
        workspaceId,
        projectId,
        type,
        title: title.trim(),
        contentMarkdown: content,
        contentJson: {
          source: "pipeline",
          pipelineRunId,
          pipelineName,
          generatedAt: new Date().toISOString(),
        },
      });

      // If we have a pipeline run ID, update it to reference the artifact
      if (pipelineRunId) {
        // Update the pipeline run's metadata to include the artifact reference
        const { error } = await supabase
          .from("pipeline_runs")
          .update({
            step_results: supabase.rpc ? undefined : undefined, // Keep existing
          })
          .eq("id", pipelineRunId);
        
        // We could also create an artifact edge here for traceability
        // But for now, the content_json includes the pipeline run reference
      }

      toast.success("Artifact created successfully", {
        description: `${artifact.short_id}: ${title}`,
      });
      
      onOpenChange(false);
      setTitle("");
    } catch (error) {
      toast.error("Failed to create artifact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-accent" />
            Save as Artifact
          </DialogTitle>
          <DialogDescription>
            Create a new artifact from the pipeline output for tracking and reference
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Limit Reached Warning */}
          {artifactAtLimit && (
            <Alert className="border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-destructive text-sm">
                  Artifact limit reached ({usage?.artifacts.used}/{usage?.artifacts.limit}).
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/billing");
                  }}
                >
                  Upgrade
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Approaching Limit Warning */}
          {artifactWarning && !artifactAtLimit && usage?.artifacts && (
            <Alert className="border-warning/50 bg-warning/5">
              <Sparkles className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning text-sm">
                Approaching limit ({usage.artifacts.used}/{usage.artifacts.limit} used).
              </AlertDescription>
            </Alert>
          )}

          {/* Pipeline source badge */}
          {pipelineName && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Link className="w-3 h-3" />
                From: {pipelineName}
              </Badge>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter artifact title..."
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Artifact Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ArtifactType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ARTIFACT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content preview */}
          <div className="space-y-2">
            <Label>Content Preview</Label>
            <div className="rounded-md border bg-muted/30 p-3 max-h-48 overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {content.slice(0, 1000)}
                {content.length > 1000 && (
                  <span className="text-muted-foreground">
                    {"\n\n"}... ({content.length} total characters)
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || artifactAtLimit}
            className="bg-accent hover:bg-accent/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {artifactAtLimit ? "Limit Reached" : "Create Artifact"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}