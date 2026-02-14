import { useState } from "react";
import {
  Loader2,
  Wand2,
  Copy,
  Check,
  Save,
  Download,
  ChevronDown,
  ChevronUp,
  Heart,
  MousePointer,
  Terminal,
  Code,
  Wind,
  Settings,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  usePromptTools,
  useGeneratePrompt,
  useSaveGeneratedPrompt,
  useGeneratedPrompts,
  type ContextConfig,
} from "@/hooks/usePromptGenerator";
import type { Artifact } from "@/hooks/useArtifacts";
import { cn } from "@/lib/utils";

const toolIcons: Record<string, typeof Heart> = {
  lovable: Heart,
  cursor: MousePointer,
  claude_code: Terminal,
  codex: Code,
  windsurf: Wind,
  custom: Settings,
};

interface PromptGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: Artifact;
}

export function PromptGeneratorDialog({
  open,
  onOpenChange,
  artifact,
}: PromptGeneratorDialogProps) {
  const { toast } = useToast();
  const { data: tools, isLoading: toolsLoading } = usePromptTools();
  const generatePrompt = useGeneratePrompt();
  const savePrompt = useSaveGeneratedPrompt();
  const { data: savedPrompts } = useGeneratedPrompts(artifact.id);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatedMeta, setGeneratedMeta] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showContextConfig, setShowContextConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  const [contextConfig, setContextConfig] = useState<ContextConfig>({
    includeParents: true,
    includeChildren: true,
    maxDepth: 3,
  });

  const handleGenerate = async () => {
    if (!selectedTool) return;

    try {
      setSaved(false);
      const result = await generatePrompt.mutateAsync({
        artifactId: artifact.id,
        toolName: selectedTool,
        contextConfig,
      });
      setGeneratedPrompt(result.prompt);
      setGeneratedMeta(result);
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate prompt",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!generatedPrompt || !generatedMeta) return;
    try {
      await savePrompt.mutateAsync({
        workspaceId: artifact.workspace_id,
        projectId: artifact.project_id,
        artifactId: artifact.id,
        toolId: generatedMeta.toolId,
        templateId: generatedMeta.templateId,
        promptContent: generatedPrompt,
        contextSnapshot: {
          artifacts: generatedMeta.contextArtifacts,
        },
        contextConfig,
        metadata: {
          usage: generatedMeta.usage,
          toolName: generatedMeta.toolName,
        },
      });
      setSaved(true);
      toast({ title: "Prompt saved", description: "Added to prompt history" });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!generatedPrompt || !selectedTool) return;
    const tool = tools?.find((t) => t.name === selectedTool);
    const ext = tool?.output_format || ".md";
    const filename = `${artifact.short_id}-${selectedTool}${ext}`;
    const blob = new Blob([generatedPrompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHistoryItem = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleReset = () => {
    setGeneratedPrompt(null);
    setGeneratedMeta(null);
    setSaved(false);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            Generate Code Prompt
          </DialogTitle>
          <DialogDescription>
            Transform "{artifact.title}" into an optimized prompt for AI code
            generation tools
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "generate" | "history")}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
              {savedPrompts && savedPrompts.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5">
                  {savedPrompts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="flex-1 flex flex-col min-h-0 mt-4">
            {generatedPrompt ? (
              /* Result view */
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Context artifacts used */}
                {generatedMeta?.contextArtifacts && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Context:
                    </span>
                    {generatedMeta.contextArtifacts.map((a: any) => (
                      <Badge
                        key={a.id}
                        variant={a.id === artifact.id ? "default" : "outline"}
                        className="text-xs"
                      >
                        {a.type} · {a.short_id}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Generated prompt */}
                <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {generatedPrompt}
                  </pre>
                </ScrollArea>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button onClick={handleCopy} variant="outline" size="sm">
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    size="sm"
                    disabled={saved || savePrompt.isPending}
                  >
                    {savePrompt.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : saved ? (
                      <Check className="w-4 h-4 mr-2 text-accent" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saved ? "Saved" : "Save"}
                  </Button>
                  <div className="flex-1" />
                  <Button onClick={handleReset} variant="ghost" size="sm">
                    Generate Another
                  </Button>
                </div>
              </div>
            ) : (
              /* Tool selection view */
              <div className="space-y-6">
                {/* Tool grid */}
                <div>
                  <Label className="mb-3 block">Select Target Tool</Label>
                  {toolsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {tools?.map((tool) => {
                        const Icon = toolIcons[tool.name] || Settings;
                        const isSelected = selectedTool === tool.name;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => setSelectedTool(tool.name)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left",
                              isSelected
                                ? "border-accent bg-accent/5 shadow-sm"
                                : "border-border hover:border-accent/50 hover:bg-muted/50"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-6 h-6",
                                isSelected
                                  ? "text-accent"
                                  : "text-muted-foreground"
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isSelected && "text-accent"
                              )}
                            >
                              {tool.display_name}
                            </span>
                            <span className="text-xs text-muted-foreground text-center line-clamp-2">
                              {tool.description}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {tool.output_format}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Context configuration */}
                <div>
                  <button
                    onClick={() => setShowContextConfig(!showContextConfig)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showContextConfig ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Context Settings
                  </button>

                  {showContextConfig && (
                    <div className="mt-3 space-y-4 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="parents" className="text-sm">
                          Include parent artifacts (PRD, Idea, etc.)
                        </Label>
                        <Switch
                          id="parents"
                          checked={contextConfig.includeParents}
                          onCheckedChange={(v) =>
                            setContextConfig((c) => ({
                              ...c,
                              includeParents: v,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="children" className="text-sm">
                          Include child artifacts (Stories, Tests, etc.)
                        </Label>
                        <Switch
                          id="children"
                          checked={contextConfig.includeChildren}
                          onCheckedChange={(v) =>
                            setContextConfig((c) => ({
                              ...c,
                              includeChildren: v,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Max depth: {contextConfig.maxDepth}
                        </Label>
                        <Slider
                          value={[contextConfig.maxDepth]}
                          onValueChange={([v]) =>
                            setContextConfig((c) => ({ ...c, maxDepth: v }))
                          }
                          min={1}
                          max={5}
                          step={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="max-h-[500px]">
              {!savedPrompts || savedPrompts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
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
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sp.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <pre className="text-xs font-mono text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {sp.prompt_content}
                      </pre>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            handleCopyHistoryItem(sp.prompt_content)
                          }
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setGeneratedPrompt(sp.prompt_content);
                            setGeneratedMeta({
                              toolId: sp.tool_id,
                              toolName: (sp.metadata as any)?.toolName,
                              templateId: sp.template_id,
                              contextArtifacts:
                                (sp.context_snapshot as any)?.artifacts || [],
                            });
                            setActiveTab("generate");
                          }}
                        >
                          View Full
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {activeTab === "generate" && !generatedPrompt && (
            <Button
              onClick={handleGenerate}
              disabled={!selectedTool || generatePrompt.isPending}
              className="bg-accent hover:bg-accent/90"
            >
              {generatePrompt.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate Prompt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
