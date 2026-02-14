import { useState } from "react";
import { Wand2, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { PromptGeneratorDialog } from "@/components/prompts/PromptGeneratorDialog";

const PromptGeneratorPage = () => {
  const { currentProjectId } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedArtifact = artifacts?.find((a) => a.id === selectedArtifactId);

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-accent" />
              Prompt Generator
            </h1>
            <p className="text-muted-foreground mt-2">
              Transform your artifacts into optimized prompts for AI code generation tools
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select an Artifact</CardTitle>
              <CardDescription>
                Choose an artifact to generate a code prompt from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !artifacts || artifacts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No artifacts found. Create artifacts first to generate prompts.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Artifact</Label>
                    <Select
                      value={selectedArtifactId || ""}
                      onValueChange={(v) => setSelectedArtifactId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an artifact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {artifacts.map((artifact) => (
                          <SelectItem key={artifact.id} value={artifact.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="font-mono text-xs text-muted-foreground">
                                {artifact.short_id}
                              </span>
                              <span className="truncate">{artifact.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {artifact.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedArtifact && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge>{selectedArtifact.type}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedArtifact.short_id}
                        </span>
                      </div>
                      <h3 className="font-medium">{selectedArtifact.title}</h3>
                      {selectedArtifact.content_markdown && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {selectedArtifact.content_markdown}
                        </p>
                      )}
                      <button
                        onClick={() => setDialogOpen(true)}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        <Wand2 className="w-4 h-4" />
                        Generate Prompt
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {selectedArtifact && (
            <PromptGeneratorDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              artifact={selectedArtifact}
            />
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default PromptGeneratorPage;
