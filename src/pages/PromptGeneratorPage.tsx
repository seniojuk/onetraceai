import { useState } from "react";
import { Wand2, FileText, Loader2, History, Copy, Eye } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { PromptGeneratorDialog } from "@/components/prompts/PromptGeneratorDialog";
import { useGeneratedPrompts } from "@/hooks/usePromptGenerator";
import { useToast } from "@/hooks/use-toast";

const PromptGeneratorPage = () => {
  const { currentProjectId } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingPrompt, setViewingPrompt] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedArtifact = artifacts?.find((a) => a.id === selectedArtifactId);
  const { data: savedPrompts } = useGeneratedPrompts(selectedArtifactId || undefined);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-4xl mx-auto space-y-6">
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
                      onValueChange={(v) => {
                        setSelectedArtifactId(v);
                        setViewingPrompt(null);
                      }}
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

          {/* Prompt History - visible on page without opening dialog */}
          {selectedArtifact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  Prompt History
                  {savedPrompts && savedPrompts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {savedPrompts.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Previously generated and saved prompts for this artifact
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!savedPrompts || savedPrompts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No saved prompts yet</p>
                    <p className="text-xs mt-1">
                      Generate and save prompts to see them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPrompts.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-4 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {(sp.metadata as any)?.toolName || "unknown"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              v{sp.version}
                            </Badge>
                            {(sp.metadata as any)?.estimatedTokensUsed && (
                              <span className="text-xs text-muted-foreground">
                                ~{(sp.metadata as any).estimatedTokensUsed.toLocaleString()} tokens
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(sp.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {viewingPrompt === sp.id ? (
                          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed p-3 rounded border bg-muted/30 max-h-[400px] overflow-auto">
                            {sp.prompt_content}
                          </pre>
                        ) : (
                          <pre className="text-xs font-mono text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                            {sp.prompt_content}
                          </pre>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleCopy(sp.prompt_content)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() =>
                              setViewingPrompt(viewingPrompt === sp.id ? null : sp.id)
                            }
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {viewingPrompt === sp.id ? "Collapse" : "View Full"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
