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
  Info,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  usePromptTools,
  useGeneratePrompt,
  useSaveGeneratedPrompt,
  useGeneratedPrompts,
  ALL_ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
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
    tokenBudget: 8000,
    includeTypes: null, // null = all
  });

  const selectedToolData = tools?.find((t) => t.name === selectedTool);

  // When tool changes, update default token budget
  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    const tool = tools?.find((t) => t.name === toolName);
    if (tool) {
      setContextConfig((c) => ({ ...c, tokenBudget: tool.default_token_limit }));
    }
  };

  const handleToggleType = (type: string, checked: boolean) => {
    setContextConfig((c) => {
      const current = c.includeTypes ?? [...ALL_ARTIFACT_TYPES];
      if (checked) {
        const next = [...current, type];
        // If all types selected, set to null
        return { ...c, includeTypes: next.length >= ALL_ARTIFACT_TYPES.length ? null : next };
      } else {
        return { ...c, includeTypes: current.filter((t) => t !== type) };
      }
    });
  };

  const isTypeIncluded = (type: string) => {
    return contextConfig.includeTypes === null || contextConfig.includeTypes.includes(type);
  };

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
          truncated: generatedMeta.truncatedArtifacts,
        },
        contextConfig,
        metadata: {
          usage: generatedMeta.usage,
          toolName: generatedMeta.toolName,
          tokenBudget: generatedMeta.tokenBudget,
          estimatedTokensUsed: generatedMeta.estimatedTokensUsed,
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

          <TabsContent value="generate" className="flex-1 flex flex-col min-h-0 mt-4 overflow-auto">
            {generatedPrompt ? (
              <ResultView
                generatedPrompt={generatedPrompt}
                generatedMeta={generatedMeta}
                artifact={artifact}
                copied={copied}
                saved={saved}
                savePrompt={savePrompt}
                onCopy={handleCopy}
                onDownload={handleDownload}
                onSave={handleSave}
                onReset={handleReset}
              />
            ) : (
              <ToolSelectionView
                tools={tools}
                toolsLoading={toolsLoading}
                selectedTool={selectedTool}
                onSelectTool={handleSelectTool}
                showContextConfig={showContextConfig}
                onToggleContextConfig={() => setShowContextConfig(!showContextConfig)}
                contextConfig={contextConfig}
                onContextConfigChange={setContextConfig}
                isTypeIncluded={isTypeIncluded}
                onToggleType={handleToggleType}
                selectedToolData={selectedToolData}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-4">
            <HistoryView
              savedPrompts={savedPrompts}
              onCopy={handleCopyHistoryItem}
              onView={(sp) => {
                setGeneratedPrompt(sp.prompt_content);
                setGeneratedMeta({
                  toolId: sp.tool_id,
                  toolName: (sp.metadata as any)?.toolName,
                  templateId: sp.template_id,
                  contextArtifacts: (sp.context_snapshot as any)?.artifacts || [],
                  truncatedArtifacts: (sp.context_snapshot as any)?.truncated || [],
                  tokenBudget: (sp.metadata as any)?.tokenBudget,
                  estimatedTokensUsed: (sp.metadata as any)?.estimatedTokensUsed,
                });
                setActiveTab("generate");
              }}
            />
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

/* ============================================
 * Sub-components
 * ============================================ */

function ResultView({
  generatedPrompt,
  generatedMeta,
  artifact,
  copied,
  saved,
  savePrompt,
  onCopy,
  onDownload,
  onSave,
  onReset,
}: {
  generatedPrompt: string;
  generatedMeta: any;
  artifact: Artifact;
  copied: boolean;
  saved: boolean;
  savePrompt: { isPending: boolean };
  onCopy: () => void;
  onDownload: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Context artifacts & token info */}
      <div className="space-y-2">
        {generatedMeta?.contextArtifacts && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Context:</span>
            {generatedMeta.contextArtifacts.map((a: any) => (
              <Badge
                key={a.id}
                variant={a.id === artifact.id ? "default" : "outline"}
                className="text-xs"
              >
                {a.type} · {a.short_id}
                {a.depth > 0 && (
                  <span className="ml-1 opacity-60">d{a.depth}</span>
                )}
              </Badge>
            ))}
          </div>
        )}
        {generatedMeta?.estimatedTokensUsed && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Tokens used: ~{generatedMeta.estimatedTokensUsed.toLocaleString()} / {generatedMeta.tokenBudget?.toLocaleString()}
            </span>
            {generatedMeta.truncatedArtifacts?.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-yellow-600 flex items-center gap-1 cursor-help">
                      <Info className="w-3 h-3" />
                      {generatedMeta.truncatedArtifacts.length} artifact(s) truncated
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {generatedMeta.truncatedArtifacts.map((t: any, i: number) => (
                        <div key={i} className="text-xs">
                          {t.type} · {t.short_id}: {t.reason.replace(/_/g, " ")}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Generated prompt */}
      <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] rounded-lg border bg-muted/30 p-4">
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
          {generatedPrompt}
        </pre>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={onCopy} variant="outline" size="sm">
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-accent" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button onClick={onDownload} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button
          onClick={onSave}
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
        <Button onClick={onReset} variant="ghost" size="sm">
          Generate Another
        </Button>
      </div>
    </div>
  );
}

function ToolSelectionView({
  tools,
  toolsLoading,
  selectedTool,
  onSelectTool,
  showContextConfig,
  onToggleContextConfig,
  contextConfig,
  onContextConfigChange,
  isTypeIncluded,
  onToggleType,
  selectedToolData,
}: {
  tools: any[] | undefined;
  toolsLoading: boolean;
  selectedTool: string | null;
  onSelectTool: (name: string) => void;
  showContextConfig: boolean;
  onToggleContextConfig: () => void;
  contextConfig: ContextConfig;
  onContextConfigChange: (config: ContextConfig) => void;
  isTypeIncluded: (type: string) => boolean;
  onToggleType: (type: string, checked: boolean) => void;
  selectedToolData: any;
}) {
  return (
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
                  onClick={() => onSelectTool(tool.name)}
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
                      isSelected ? "text-accent" : "text-muted-foreground"
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
          onClick={onToggleContextConfig}
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
          <div className="mt-3 space-y-5 p-4 rounded-lg border bg-muted/30">
            {/* Direction toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="parents" className="text-sm">
                  Include parent artifacts (PRD, Idea, etc.)
                </Label>
                <Switch
                  id="parents"
                  checked={contextConfig.includeParents}
                  onCheckedChange={(v) =>
                    onContextConfigChange({ ...contextConfig, includeParents: v })
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
                    onContextConfigChange({ ...contextConfig, includeChildren: v })
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Type filters */}
            <div className="space-y-2">
              <Label className="text-sm">Include artifact types</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_ARTIFACT_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={isTypeIncluded(type)}
                      onCheckedChange={(checked) =>
                        onToggleType(type, checked === true)
                      }
                    />
                    <span className="text-muted-foreground">
                      {ARTIFACT_TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Depth slider */}
            <div className="space-y-2">
              <Label className="text-sm">
                Max depth: {contextConfig.maxDepth}
              </Label>
              <Slider
                value={[contextConfig.maxDepth]}
                onValueChange={([v]) =>
                  onContextConfigChange({ ...contextConfig, maxDepth: v })
                }
                min={1}
                max={5}
                step={1}
              />
            </div>

            {/* Token budget slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Token budget: {contextConfig.tokenBudget.toLocaleString()}
                </Label>
                {selectedToolData && (
                  <span className="text-xs text-muted-foreground">
                    Default: {selectedToolData.default_token_limit.toLocaleString()}
                  </span>
                )}
              </div>
              <Slider
                value={[contextConfig.tokenBudget]}
                onValueChange={([v]) =>
                  onContextConfigChange({ ...contextConfig, tokenBudget: v })
                }
                min={2000}
                max={32000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                Controls how much artifact context is sent to the AI. Higher = more context but slower.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryView({
  savedPrompts,
  onCopy,
  onView,
}: {
  savedPrompts: any[] | undefined;
  onCopy: (content: string) => void;
  onView: (sp: any) => void;
}) {
  return (
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
              <pre className="text-xs font-mono text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                {sp.prompt_content}
              </pre>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onCopy(sp.prompt_content)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onView(sp)}
                >
                  View Full
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
