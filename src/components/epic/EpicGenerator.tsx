import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Loader2,
  MessageCircle,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Pencil,
  Save,
  X,
  Trash2,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCreateArtifact, useArtifacts, Artifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { useFilesForArtifact } from "@/hooks/useFileArtifacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AIRunLimitWarning, useAIRunLimit } from "@/components/billing/AIRunLimitWarning";
import { useAIRunTracking } from "@/hooks/useAIRunTracking";

// Check if file type is text-extractable
const isTextExtractable = (fileType: string, fileName: string): boolean => {
  const textTypes = [
    'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
    'application/json', 'application/xml', 'text/xml',
    'application/javascript', 'text/javascript'
  ];
  const textExtensions = ['.txt', '.md', '.markdown', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.yaml', '.yml'];
  
  if (textTypes.includes(fileType)) return true;
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return textExtensions.includes(ext);
};

interface Question {
  id: string;
  question: string;
  category: string;
  options?: string[];
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  questions?: Question[];
  summary?: string;
}

interface EpicData {
  title: string;
  description: string;
  businessValue: string;
  goals: string[];
  successCriteria: string[];
  size: "S" | "M" | "L" | "XL";
  priority: "high" | "medium" | "low";
  dependencies?: string[];
  suggestedStories?: string[];
}

interface EpicGeneratorProps {
  onComplete?: (artifactIds: string[]) => void;
  initialPRD?: string;
  sourceArtifact?: Artifact;
}

export const EpicGenerator = ({ onComplete, initialPRD, sourceArtifact }: EpicGeneratorProps) => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const createArtifact = useCreateArtifact();
  const createEdge = useCreateArtifactEdge();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined, "PRD");
  const { canRunAI, isAtLimit } = useAIRunLimit();
  const { startRun, completeRunWithResult, failRunWithError } = useAIRunTracking();
  
  // Track the current AI run ID
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  // Get the effective PRD artifact ID for file fetching
  const effectivePrdId = sourceArtifact?.id || "";
  const { data: attachedFiles } = useFilesForArtifact(effectivePrdId || undefined, currentProjectId || undefined);

  const [phase, setPhase] = useState<"prd" | "questions" | "complete">("prd");
  const [prdSource, setPrdSource] = useState<"new" | "existing">(sourceArtifact ? "existing" : "new");
  const [selectedPrdId, setSelectedPrdId] = useState<string>(sourceArtifact?.id || "");
  const [prdContent, setPrdContent] = useState(initialPRD || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedEpics, setGeneratedEpics] = useState<EpicData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [sourcePrdArtifact, setSourcePrdArtifact] = useState<Artifact | undefined>(sourceArtifact);
  const [attachedFileContents, setAttachedFileContents] = useState<Array<{ name: string; type: string; content: string }>>([]);
  
  // State for editing and individual saving
  const [editingEpicIndex, setEditingEpicIndex] = useState<number | null>(null);
  const [editedEpic, setEditedEpic] = useState<EpicData | null>(null);
  const [savedEpicIndices, setSavedEpicIndices] = useState<Set<number>>(new Set());
  const [savingEpicIndex, setSavingEpicIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [selectedEpics, setSelectedEpics] = useState<Set<number>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Extract text content from attached files
  useEffect(() => {
    const extractFileContents = async () => {
      if (!attachedFiles || attachedFiles.length === 0) {
        setAttachedFileContents([]);
        return;
      }

      const contents: Array<{ name: string; type: string; content: string }> = [];
      
      for (const file of attachedFiles) {
        const fileInfo = file.content_json;
        if (!fileInfo || !isTextExtractable(fileInfo.file_type, fileInfo.file_name)) continue;

        try {
          const { data, error } = await supabase.storage
            .from("artifact-files")
            .download(fileInfo.storage_path);

          if (error || !data) continue;

          const text = await data.text();
          const truncatedContent = text.length > 10000 ? text.substring(0, 10000) + "\n...[content truncated]" : text;
          
          contents.push({
            name: fileInfo.file_name,
            type: fileInfo.file_type,
            content: truncatedContent
          });
        } catch (err) {
          console.error(`Failed to extract content from ${fileInfo.file_name}:`, err);
        }
      }

      setAttachedFileContents(contents);
    };

    extractFileContents();
  }, [attachedFiles]);

  // Get PRD text from selected artifact
  const getPrdText = (): string => {
    if (prdSource === "new") {
      return prdContent.trim();
    }
    const selectedArtifact = artifacts?.find(a => a.id === selectedPrdId);
    if (selectedArtifact) {
      setSourcePrdArtifact(selectedArtifact);
      const parts = [selectedArtifact.title];
      if (selectedArtifact.content_markdown) {
        parts.push(selectedArtifact.content_markdown);
      }
      return parts.join("\n\n");
    }
    return "";
  };

  const callEpicGenerator = async (
    prd: string | null,
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-epics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prdContent: prd,
          conversationHistory: conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          action,
          attachedFiles: attachedFileContents,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate epics");
    }

    return response.json();
  };

  const handleSubmitPrd = async () => {
    if (isAtLimit) {
      toast.error("You've reached your AI run limit. Please upgrade your plan to continue.");
      return;
    }
    
    const prd = getPrdText();
    if (!prd) {
      toast.error("Please enter PRD content or select an existing PRD");
      return;
    }

    setIsLoading(true);
    
    // Start AI run tracking
    let runId: string | null = null;
    if (currentWorkspaceId) {
      runId = await startRun({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId || undefined,
        generationType: "EPIC",
        sourceArtifactId: sourceArtifact?.id,
        inputSource: prdSource === "existing" ? "EXISTING_PRD" : "NEW_PRD",
      });
      setCurrentRunId(runId);
    }
    
    try {
      const data = await callEpicGenerator(prd, []);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          { role: "user", content: prd },
          {
            role: "assistant",
            content: data.summary || "I have some questions to help create comprehensive epics.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
        setPhase("questions");
        // Don't complete the run yet - we're still in conversation
      } else if (data.phase === "complete" && data.epics) {
        setGeneratedEpics(data.epics);
        setPhase("complete");
        
        // Complete the AI run tracking
        if (runId && currentWorkspaceId) {
          await completeRunWithResult(runId, currentWorkspaceId, {
            generatedItems: data.epics.map((e: EpicData) => ({ title: e.title, type: "EPIC" })),
          });
          setCurrentRunId(null);
        }
      }
    } catch (error) {
      // Fail the AI run tracking
      if (runId && currentWorkspaceId) {
        await failRunWithError(runId, currentWorkspaceId, error instanceof Error ? error.message : "Unknown error");
        setCurrentRunId(null);
      }
      toast.error(error instanceof Error ? error.message : "Failed to start epic generation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAnswers = async () => {
    const answerText = currentQuestions
      .map((q) => `**${q.question}**\n${answers[q.id] || "No answer provided"}`)
      .join("\n\n");

    setIsLoading(true);
    try {
      const newConversation: ConversationMessage[] = [
        ...conversation,
        { role: "user", content: answerText },
      ];

      setConversation(newConversation);
      setAnswers({});

      const data = await callEpicGenerator(null, newConversation);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: data.summary || "I have a few more questions.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
      } else if (data.phase === "complete" && data.epics) {
        setGeneratedEpics(data.epics);
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: "I've generated your epics based on our conversation.",
          },
        ]);
        setPhase("complete");
        
        // Complete the AI run tracking
        if (currentRunId && currentWorkspaceId) {
          await completeRunWithResult(currentRunId, currentWorkspaceId, {
            generatedItems: data.epics.map((e: EpicData) => ({ title: e.title, type: "EPIC" })),
          });
          setCurrentRunId(null);
        }
      }
    } catch (error) {
      // Fail the AI run tracking
      if (currentRunId && currentWorkspaceId) {
        await failRunWithError(currentRunId, currentWorkspaceId, error instanceof Error ? error.message : "Unknown error");
        setCurrentRunId(null);
      }
      toast.error(error instanceof Error ? error.message : "Failed to process answers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNow = async () => {
    setIsLoading(true);
    try {
      const answerText = currentQuestions
        .filter((q) => answers[q.id])
        .map((q) => `**${q.question}**\n${answers[q.id]}`)
        .join("\n\n");

      const newConversation: ConversationMessage[] = answerText
        ? [...conversation, { role: "user", content: answerText }]
        : conversation;

      const data = await callEpicGenerator(null, newConversation, "generate");

      if (data.phase === "complete" && data.epics) {
        setGeneratedEpics(data.epics);
        setPhase("complete");
        
        // Complete the AI run tracking
        if (currentRunId && currentWorkspaceId) {
          await completeRunWithResult(currentRunId, currentWorkspaceId, {
            generatedItems: data.epics.map((e: EpicData) => ({ title: e.title, type: "EPIC" })),
          });
          setCurrentRunId(null);
        }
      }
    } catch (error) {
      // Fail the AI run tracking
      if (currentRunId && currentWorkspaceId) {
        await failRunWithError(currentRunId, currentWorkspaceId, error instanceof Error ? error.message : "Unknown error");
        setCurrentRunId(null);
      }
      toast.error(error instanceof Error ? error.message : "Failed to generate epics");
    } finally {
      setIsLoading(false);
    }
  };

  const convertEpicToMarkdown = (epic: EpicData): string => {
    let md = `## ${epic.title}\n\n`;
    md += `${epic.description}\n\n`;
    md += `**Business Value:** ${epic.businessValue}\n\n`;
    md += `**Size:** ${epic.size} | **Priority:** ${epic.priority}\n\n`;
    
    if (epic.goals && epic.goals.length > 0) {
      md += `### Goals\n`;
      for (const goal of epic.goals) {
        md += `- ${goal}\n`;
      }
      md += "\n";
    }

    if (epic.successCriteria && epic.successCriteria.length > 0) {
      md += `### Success Criteria\n`;
      for (const criteria of epic.successCriteria) {
        md += `- [ ] ${criteria}\n`;
      }
      md += "\n";
    }

    if (epic.dependencies && epic.dependencies.length > 0) {
      md += `### Dependencies\n`;
      for (const dep of epic.dependencies) {
        md += `- ${dep}\n`;
      }
      md += "\n";
    }

    if (epic.suggestedStories && epic.suggestedStories.length > 0) {
      md += `### Suggested Stories\n`;
      for (const story of epic.suggestedStories) {
        md += `- ${story}\n`;
      }
    }

    return md;
  };

  const handleSaveEpics = async () => {
    if (!generatedEpics.length || !currentWorkspaceId || !currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setIsSaving(true);
    const createdIds: string[] = [];
    
    try {
      for (let i = 0; i < generatedEpics.length; i++) {
        if (savedEpicIndices.has(i)) continue;
        
        const epic = generatedEpics[i];
        const markdown = convertEpicToMarkdown(epic);

        const artifact = await createArtifact.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          type: "EPIC",
          title: epic.title,
          contentMarkdown: markdown,
          contentJson: epic,
        });

        createdIds.push(artifact.id);
        setSavedEpicIndices(prev => new Set(prev).add(i));

        // Create edge from PRD to Epic
        if (sourcePrdArtifact && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: sourcePrdArtifact.id,
            toArtifactId: artifact.id,
            edgeType: "DERIVES_FROM",
            source: "AI_INFERRED",
            sourceRef: "epic-generator",
            metadata: { generatedFrom: "prd" },
          });
        }
      }

      toast.success(`Saved ${createdIds.length} epics successfully`);

      if (onComplete) {
        onComplete(createdIds);
      } else {
        navigate("/artifacts");
      }
    } catch (error) {
      toast.error("Failed to save epics");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSingleEpic = async (index: number) => {
    if (!currentWorkspaceId || !currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setSavingEpicIndex(index);
    const epic = generatedEpics[index];
    
    try {
      const markdown = convertEpicToMarkdown(epic);

      const artifact = await createArtifact.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        type: "EPIC",
        title: epic.title,
        contentMarkdown: markdown,
        contentJson: epic,
      });

      // Create edge from PRD to Epic
      if (sourcePrdArtifact && artifact) {
        await createEdge.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          fromArtifactId: sourcePrdArtifact.id,
          toArtifactId: artifact.id,
          edgeType: "DERIVES_FROM",
          source: "AI_INFERRED",
          sourceRef: "epic-generator",
          metadata: { generatedFrom: "prd" },
        });
      }

      setSavedEpicIndices(prev => new Set(prev).add(index));
      toast.success(`Saved "${epic.title}"`);
    } catch (error) {
      toast.error("Failed to save epic");
    } finally {
      setSavingEpicIndex(null);
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingEpicIndex(index);
    setEditedEpic({ ...generatedEpics[index] });
  };

  const handleCancelEdit = () => {
    setEditingEpicIndex(null);
    setEditedEpic(null);
  };

  const handleSaveEdit = () => {
    if (editingEpicIndex !== null && editedEpic) {
      const updated = [...generatedEpics];
      updated[editingEpicIndex] = editedEpic;
      setGeneratedEpics(updated);
      setEditingEpicIndex(null);
      setEditedEpic(null);
      toast.success("Epic updated");
    }
  };

  const handleDeleteEpic = (index: number) => {
    setGeneratedEpics(prev => prev.filter((_, i) => i !== index));
    setSavedEpicIndices(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
    setDeleteConfirmIndex(null);
    toast.success("Epic removed");
  };

  const handleToggleSelect = (index: number) => {
    setSelectedEpics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const unsavedIndices = generatedEpics
      .map((_, idx) => idx)
      .filter(idx => !savedEpicIndices.has(idx));
    setSelectedEpics(new Set(unsavedIndices));
  };

  const handleDeselectAll = () => {
    setSelectedEpics(new Set());
  };

  const handleBulkSave = async () => {
    if (!currentWorkspaceId || !currentProjectId || selectedEpics.size === 0) return;

    setIsBulkSaving(true);
    const indicesToSave = Array.from(selectedEpics).filter(idx => !savedEpicIndices.has(idx));
    let savedCount = 0;

    try {
      for (const idx of indicesToSave) {
        const epic = generatedEpics[idx];
        const markdown = convertEpicToMarkdown(epic);

        const artifact = await createArtifact.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          type: "EPIC",
          title: epic.title,
          contentMarkdown: markdown,
          contentJson: epic,
        });

        if (sourcePrdArtifact && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: sourcePrdArtifact.id,
            toArtifactId: artifact.id,
            edgeType: "DERIVES_FROM",
            source: "AI_INFERRED",
            sourceRef: "epic-generator",
            metadata: { generatedFrom: "prd" },
          });
        }

        setSavedEpicIndices(prev => new Set(prev).add(idx));
        savedCount++;
      }

      setSelectedEpics(new Set());
      toast.success(`Saved ${savedCount} epic(s) successfully`);
    } catch (error) {
      toast.error("Failed to save some epics");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleReset = () => {
    setPhase("prd");
    setPrdContent(initialPRD || "");
    setSelectedPrdId(sourceArtifact?.id || "");
    setPrdSource(sourceArtifact ? "existing" : "new");
    setConversation([]);
    setCurrentQuestions([]);
    setAnswers({});
    setGeneratedEpics([]);
    setSavedEpicIndices(new Set());
    setSelectedEpics(new Set());
    setSourcePrdArtifact(sourceArtifact);
  };

  const prdArtifacts = artifacts || [];
  const hasExistingPrds = prdArtifacts.length > 0;
  const canSubmitPrd = prdSource === "new" ? prdContent.trim().length > 0 : selectedPrdId.length > 0;
  const hasUnsavedEpics = generatedEpics.some((_, i) => !savedEpicIndices.has(i));
  const allSaved = generatedEpics.length > 0 && generatedEpics.every((_, i) => savedEpicIndices.has(i));
  const selectedUnsavedCount = Array.from(selectedEpics).filter(idx => !savedEpicIndices.has(idx)).length;

  const sizeColors: Record<string, string> = {
    S: "bg-green-100 text-green-800",
    M: "bg-yellow-100 text-yellow-800",
    L: "bg-orange-100 text-orange-800",
    XL: "bg-red-100 text-red-800",
  };

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6">
      {/* AI Run Limit Warning */}
      <AIRunLimitWarning />

      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "prd" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>PRD</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "questions"
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Clarify</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "complete"
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <GitBranch className="w-4 h-4" />
          <span>Epics</span>
        </div>
      </div>

      {/* PRD Phase */}
      {phase === "prd" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              {sourceArtifact ? `Generate Epics from "${sourceArtifact.title}"` : "Select or Paste PRD"}
            </CardTitle>
            <CardDescription>
              {sourceArtifact 
                ? "The AI will analyze your PRD and ask clarifying questions to create comprehensive epics."
                : "Share your PRD content or select an existing PRD. The AI will help break it down into epics."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PRD Source Toggle */}
            {!sourceArtifact && hasExistingPrds && (
              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setPrdSource("new")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    prdSource === "new"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Paste PRD
                </button>
                <button
                  type="button"
                  onClick={() => setPrdSource("existing")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    prdSource === "existing"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GitBranch className="w-4 h-4" />
                  Select Existing
                </button>
              </div>
            )}

            {prdSource === "existing" && !sourceArtifact ? (
              <Select value={selectedPrdId} onValueChange={setSelectedPrdId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a PRD..." />
                </SelectTrigger>
                <SelectContent>
                  {prdArtifacts.map((prd) => (
                    <SelectItem key={prd.id} value={prd.id}>
                      {prd.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : !sourceArtifact ? (
              <Textarea
                placeholder="Paste your PRD content here..."
                value={prdContent}
                onChange={(e) => setPrdContent(e.target.value)}
                className="min-h-[200px]"
              />
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Using PRD: <strong>{sourceArtifact.title}</strong>
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmitPrd}
              disabled={isLoading || !canSubmitPrd || isAtLimit}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing PRD...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Start Epic Generation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Questions Phase */}
      {phase === "questions" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-accent" />
              Clarifying Questions
            </CardTitle>
            <CardDescription>
              {conversation[conversation.length - 1]?.summary ||
                "Help me understand your requirements better"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {currentQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0">
                        {q.category}
                      </Badge>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    {q.options && q.options.length > 0 ? (
                      <div className="space-y-2 ml-4">
                        {q.options.map((option) => (
                          <label
                            key={option}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors",
                              answers[q.id] === option
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50"
                            )}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={option}
                              checked={answers[q.id] === option}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="accent-accent"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                        <Textarea
                          placeholder="Or provide your own answer..."
                          value={answers[q.id]?.startsWith("Custom:") ? answers[q.id].slice(7) : ""}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value ? `Custom: ${e.target.value}` : "")
                          }
                          className="mt-2"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Type your answer..."
                        value={answers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="ml-4"
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleGenerateNow} disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Now
              </Button>
              <Button
                onClick={handleSubmitAnswers}
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Answers
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Phase - Generated Epics */}
      {phase === "complete" && generatedEpics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Generated Epics ({generatedEpics.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              {hasUnsavedEpics && (
                <>
                  <Button variant="outline" size="sm" onClick={selectedEpics.size > 0 ? handleDeselectAll : handleSelectAll}>
                    {selectedEpics.size > 0 ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedUnsavedCount > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkSave}
                      disabled={isBulkSaving}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {isBulkSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Selected ({selectedUnsavedCount})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {generatedEpics.map((epic, index) => {
              const isEditing = editingEpicIndex === index;
              const isSaved = savedEpicIndices.has(index);
              const isSelected = selectedEpics.has(index);
              const epicToShow = isEditing && editedEpic ? editedEpic : epic;

              return (
                <Card
                  key={index}
                  className={cn(
                    "transition-all",
                    isSaved && "opacity-60",
                    isSelected && !isSaved && "ring-2 ring-accent"
                  )}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {!isSaved && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(index)}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {isEditing ? (
                              <Input
                                value={editedEpic?.title || ""}
                                onChange={(e) =>
                                  setEditedEpic(prev => prev ? { ...prev, title: e.target.value } : null)
                                }
                                className="text-lg font-semibold"
                              />
                            ) : (
                              <h4 className="text-lg font-semibold">{epicToShow.title}</h4>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge className={sizeColors[epicToShow.size]}>{epicToShow.size}</Badge>
                            <Badge className={priorityColors[epicToShow.priority]}>
                              {epicToShow.priority}
                            </Badge>
                            {isSaved && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Saved
                              </Badge>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <Textarea
                            value={editedEpic?.description || ""}
                            onChange={(e) =>
                              setEditedEpic(prev => prev ? { ...prev, description: e.target.value } : null)
                            }
                            rows={3}
                          />
                        ) : (
                          <p className="text-muted-foreground">{epicToShow.description}</p>
                        )}

                        <div className="text-sm">
                          <strong>Business Value:</strong> {epicToShow.businessValue}
                        </div>

                        {epicToShow.suggestedStories && epicToShow.suggestedStories.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-2">Suggested Stories:</p>
                            <div className="flex flex-wrap gap-2">
                              {epicToShow.suggestedStories.map((story, storyIdx) => (
                                <Badge key={storyIdx} variant="secondary" className="text-xs">
                                  {story}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit} className="bg-accent hover:bg-accent/90">
                                <Save className="w-4 h-4 mr-1" />
                                Apply Changes
                              </Button>
                            </>
                          ) : (
                            <>
                              {!isSaved && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleStartEdit(index)}>
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveSingleEpic(index)}
                                    disabled={savingEpicIndex === index}
                                    className="bg-accent hover:bg-accent/90"
                                  >
                                    {savingEpicIndex === index ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4 mr-1" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteConfirmIndex(index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {allSaved && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate("/artifacts")} className="bg-accent hover:bg-accent/90">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                View All Artifacts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Epic?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the epic from the generated list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmIndex !== null && handleDeleteEpic(deleteConfirmIndex)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
