import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Loader2,
  MessageCircle,
  FileText,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ListChecks,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Paperclip,
  Wand2,
  RotateCcw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateArtifact, useArtifacts, Artifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { useFilesForArtifact } from "@/hooks/useFileArtifacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface StoryData {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  priority: "high" | "medium" | "low";
  epic?: string;
}

interface StoryGeneratorProps {
  onComplete?: (artifactIds: string[]) => void;
  initialPRD?: string;
  sourceArtifact?: Artifact;
}

export const StoryGenerator = ({ onComplete, initialPRD, sourceArtifact }: StoryGeneratorProps) => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const createArtifact = useCreateArtifact();
  const createEdge = useCreateArtifactEdge();
  const { data: prdArtifacts } = useArtifacts(currentProjectId || undefined, "PRD");
  const { data: epicArtifacts } = useArtifacts(currentProjectId || undefined, "EPIC");

  // Detect if source is an Epic
  const isSourceEpic = sourceArtifact?.type === "EPIC";
  
  // State for parent PRD when source is Epic
  const [parentPrdArtifact, setParentPrdArtifact] = useState<Artifact | null>(null);
  const [parentPrdFileContents, setParentPrdFileContents] = useState<Array<{ name: string; type: string; content: string }>>([]);
  
  // Get the effective PRD artifact ID for file fetching (use parent PRD if source is Epic)
  const effectivePrdId = isSourceEpic ? parentPrdArtifact?.id : sourceArtifact?.id;
  const { data: attachedFiles } = useFilesForArtifact(effectivePrdId || undefined, currentProjectId || undefined);

  const [phase, setPhase] = useState<"prd" | "questions" | "complete">("prd");
  const [prdSource, setPrdSource] = useState<"new" | "existing">(sourceArtifact ? "existing" : "new");
  const [selectedPrdId, setSelectedPrdId] = useState<string>(sourceArtifact?.id || "");
  const [prdContent, setPrdContent] = useState(initialPRD || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedStories, setGeneratedStories] = useState<StoryData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [sourcePrdArtifact, setSourcePrdArtifact] = useState<Artifact | undefined>(sourceArtifact);
  const [attachedFileContents, setAttachedFileContents] = useState<Array<{ name: string; type: string; content: string }>>([]);
  
  // Epic linking state - auto-assign the source epic if generating from Epic
  const [selectedEpicId, setSelectedEpicId] = useState<string>(isSourceEpic && sourceArtifact?.id ? sourceArtifact.id : "");
  const [storyEpicAssignments, setStoryEpicAssignments] = useState<Record<number, string>>({});
  
  // New state for editing and individual saving
  const [editingStoryIndex, setEditingStoryIndex] = useState<number | null>(null);
  const [editedStory, setEditedStory] = useState<StoryData | null>(null);
  const [savedStoryIndices, setSavedStoryIndices] = useState<Set<number>>(new Set());
  const [savingStoryIndex, setSavingStoryIndex] = useState<number | null>(null);
  const [newAcInput, setNewAcInput] = useState("");
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [selectedStories, setSelectedStories] = useState<Set<number>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Refine with AI state
  const [refiningStoryIndex, setRefiningStoryIndex] = useState<number | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);

  // Fetch parent PRD when source is an Epic
  useEffect(() => {
    const fetchParentPrd = async () => {
      if (!isSourceEpic || !sourceArtifact?.id || !currentProjectId) {
        setParentPrdArtifact(null);
        return;
      }

      try {
        // Find edges where this Epic is the target (derives from PRD)
        const { data: edges, error: edgesError } = await supabase
          .from("artifact_edges")
          .select("from_artifact_id")
          .eq("to_artifact_id", sourceArtifact.id)
          .eq("project_id", currentProjectId)
          .in("edge_type", ["DERIVES_FROM", "CONTAINS"]);

        if (edgesError || !edges?.length) {
          console.log("No parent PRD found for epic");
          return;
        }

        // Fetch the parent artifact (should be a PRD)
        const { data: parentArtifact, error: artifactError } = await supabase
          .from("artifacts")
          .select("*")
          .eq("id", edges[0].from_artifact_id)
          .eq("type", "PRD")
          .single();

        if (!artifactError && parentArtifact) {
          setParentPrdArtifact(parentArtifact as Artifact);
          // Also set as source PRD artifact for edge creation
          setSourcePrdArtifact(parentArtifact as Artifact);
        }
      } catch (err) {
        console.error("Failed to fetch parent PRD:", err);
      }
    };

    fetchParentPrd();
  }, [isSourceEpic, sourceArtifact?.id, currentProjectId]);

  // Extract text content from attached files (works for both direct PRD and parent PRD of Epic)
  useEffect(() => {
    const extractFileContents = async () => {
      if (!attachedFiles || attachedFiles.length === 0) {
        setAttachedFileContents([]);
        if (isSourceEpic) setParentPrdFileContents([]);
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

      if (isSourceEpic) {
        setParentPrdFileContents(contents);
      }
      setAttachedFileContents(contents);
    };

    extractFileContents();
  }, [attachedFiles, isSourceEpic]);

  // Get PRD text from selected artifact
  const getPrdText = (): string => {
    if (prdSource === "new") {
      return prdContent.trim();
    }
    const selectedArtifact = prdArtifacts?.find(a => a.id === selectedPrdId);
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
  
  // Get Epic artifact by ID
  const getEpicArtifact = (epicId: string): Artifact | undefined => {
    return epicArtifacts?.find(e => e.id === epicId);
  };

  // Assign epic to all selected stories
  const handleAssignEpicToSelected = () => {
    if (!selectedEpicId || selectedStories.size === 0) return;
    const newAssignments = { ...storyEpicAssignments };
    selectedStories.forEach(idx => {
      if (!savedStoryIndices.has(idx)) {
        newAssignments[idx] = selectedEpicId;
      }
    });
    setStoryEpicAssignments(newAssignments);
    toast.success(`Assigned epic to ${selectedStories.size} stories`);
  };

  // Assign epic to individual story
  const handleAssignEpicToStory = (storyIndex: number, epicId: string) => {
    setStoryEpicAssignments(prev => ({
      ...prev,
      [storyIndex]: epicId,
    }));
  };

  // Remove epic assignment
  const handleRemoveEpicAssignment = (storyIndex: number) => {
    setStoryEpicAssignments(prev => {
      const updated = { ...prev };
      delete updated[storyIndex];
      return updated;
    });
  };

  // Get Epic content for the API call
  const getEpicContent = (): string | null => {
    if (!isSourceEpic || !sourceArtifact) return null;
    const parts = [sourceArtifact.title];
    if (sourceArtifact.content_markdown) {
      parts.push(sourceArtifact.content_markdown);
    }
    return parts.join("\n\n");
  };

  // Get parent PRD content when generating from Epic
  const getParentPrdContent = (): string | null => {
    if (!parentPrdArtifact) return null;
    const parts = [parentPrdArtifact.title];
    if (parentPrdArtifact.content_markdown) {
      parts.push(parentPrdArtifact.content_markdown);
    }
    return parts.join("\n\n");
  };

  const callStoryGenerator = async (
    prd: string | null,
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    // Build the request body with Epic context if applicable
    const requestBody: Record<string, unknown> = {
      prdContent: prd,
      conversationHistory: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      action,
      attachedFiles: attachedFileContents,
    };

    // Add Epic-specific context if generating from an Epic
    if (isSourceEpic && sourceArtifact) {
      requestBody.epicContent = getEpicContent();
      requestBody.epicTitle = sourceArtifact.title;
      requestBody.parentPrdContent = getParentPrdContent();
      requestBody.parentPrdTitle = parentPrdArtifact?.title || null;
      requestBody.parentPrdFiles = parentPrdFileContents;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate stories");
    }

    return response.json();
  };

  const handleSubmitPrd = async () => {
    // When generating from Epic, use Epic content as primary source
    const contentToProcess = isSourceEpic ? getEpicContent() : getPrdText();
    
    if (!contentToProcess) {
      toast.error(isSourceEpic 
        ? "Epic content not available" 
        : "Please enter PRD content or select an existing PRD"
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await callStoryGenerator(isSourceEpic ? null : contentToProcess, []);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          { role: "user", content: contentToProcess },
          {
            role: "assistant",
            content: data.summary || "I have some questions to help create comprehensive stories.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
        setPhase("questions");
      } else if (data.phase === "complete" && data.stories) {
        setGeneratedStories(data.stories);
        // Auto-assign all stories to the source Epic when generating from Epic
        if (isSourceEpic && sourceArtifact?.id) {
          const assignments: Record<number, string> = {};
          data.stories.forEach((_: StoryData, idx: number) => {
            assignments[idx] = sourceArtifact.id;
          });
          setStoryEpicAssignments(assignments);
        }
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start story generation");
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

      const data = await callStoryGenerator(null, newConversation);

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
      } else if (data.phase === "complete" && data.stories) {
        setGeneratedStories(data.stories);
        // Auto-assign all stories to the source Epic when generating from Epic
        if (isSourceEpic && sourceArtifact?.id) {
          const assignments: Record<number, string> = {};
          data.stories.forEach((_: StoryData, idx: number) => {
            assignments[idx] = sourceArtifact.id;
          });
          setStoryEpicAssignments(assignments);
        }
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: "I've generated your stories based on our conversation.",
          },
        ]);
        setPhase("complete");
      }
    } catch (error) {
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

      const data = await callStoryGenerator(null, newConversation, "generate");

      if (data.phase === "complete" && data.stories) {
        setGeneratedStories(data.stories);
        // Auto-assign all stories to the source Epic when generating from Epic
        if (isSourceEpic && sourceArtifact?.id) {
          const assignments: Record<number, string> = {};
          data.stories.forEach((_: StoryData, idx: number) => {
            assignments[idx] = sourceArtifact.id;
          });
          setStoryEpicAssignments(assignments);
        }
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate stories");
    } finally {
      setIsLoading(false);
    }
  };

  const convertStoryToMarkdown = (story: StoryData): string => {
    let md = `## ${story.title}\n\n`;
    md += `${story.description}\n\n`;
    md += `**Priority:** ${story.priority}\n`;
    md += `**Story Points:** ${story.storyPoints}\n`;
    if (story.epic) {
      md += `**Epic:** ${story.epic}\n`;
    }
    md += `\n### Acceptance Criteria\n`;
    for (const ac of story.acceptanceCriteria) {
      md += `- [ ] ${ac}\n`;
    }
    return md;
  };

  const handleSaveStories = async () => {
    if (!generatedStories.length || !currentWorkspaceId || !currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setIsSaving(true);
    const createdIds: string[] = [];
    
    try {
      for (let i = 0; i < generatedStories.length; i++) {
        if (savedStoryIndices.has(i)) continue; // Skip already saved
        
        const story = generatedStories[i];
        const markdown = convertStoryToMarkdown(story);

        const artifact = await createArtifact.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          type: "STORY",
          title: story.title,
          contentMarkdown: markdown,
          contentJson: story,
        });

        createdIds.push(artifact.id);
        setSavedStoryIndices(prev => new Set(prev).add(i));

        // Create edge to source PRD if we have one
        if (sourcePrdArtifact && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: sourcePrdArtifact.id,
            toArtifactId: artifact.id,
            edgeType: "DERIVES_FROM",
            source: "AI_INFERRED",
            sourceRef: "story-generator",
            metadata: { generatedFrom: "prd" },
          });
        }

        // Create edge to Epic if assigned
        const epicId = storyEpicAssignments[i];
        if (epicId && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: epicId,
            toArtifactId: artifact.id,
            edgeType: "CONTAINS",
            source: "USER_ASSIGNED",
            sourceRef: "story-generator",
            metadata: { linkedVia: "epic-selector" },
          });
        }
      }

      toast.success(`Saved ${createdIds.length} stories successfully`);

      if (onComplete) {
        onComplete(createdIds);
      } else {
        navigate("/artifacts");
      }
    } catch (error) {
      toast.error("Failed to save stories");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSingleStory = async (index: number) => {
    if (!currentWorkspaceId || !currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setSavingStoryIndex(index);
    const story = generatedStories[index];
    
    try {
      const markdown = convertStoryToMarkdown(story);

      const artifact = await createArtifact.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        type: "STORY",
        title: story.title,
        contentMarkdown: markdown,
        contentJson: story,
      });

        // Create edge to source PRD if we have one
        if (sourcePrdArtifact && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: sourcePrdArtifact.id,
            toArtifactId: artifact.id,
            edgeType: "DERIVES_FROM",
            source: "AI_INFERRED",
            sourceRef: "story-generator",
            metadata: { generatedFrom: "prd" },
          });
        }

        // Create edge to Epic if assigned
        const epicId = storyEpicAssignments[index];
        if (epicId && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: epicId,
            toArtifactId: artifact.id,
            edgeType: "CONTAINS",
            source: "USER_ASSIGNED",
            sourceRef: "story-generator",
            metadata: { linkedVia: "epic-selector" },
          });
        }

        setSavedStoryIndices(prev => new Set(prev).add(index));
        toast.success(`Saved "${story.title}"`);
    } catch (error) {
      toast.error("Failed to save story");
    } finally {
      setSavingStoryIndex(null);
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingStoryIndex(index);
    setEditedStory({ ...generatedStories[index] });
    setNewAcInput("");
  };

  const handleCancelEdit = () => {
    setEditingStoryIndex(null);
    setEditedStory(null);
    setNewAcInput("");
  };

  const handleSaveEdit = () => {
    if (editingStoryIndex !== null && editedStory) {
      const updated = [...generatedStories];
      updated[editingStoryIndex] = editedStory;
      setGeneratedStories(updated);
      setEditingStoryIndex(null);
      setEditedStory(null);
      setNewAcInput("");
      toast.success("Story updated");
    }
  };

  const handleAddAc = () => {
    if (editedStory && newAcInput.trim()) {
      setEditedStory({
        ...editedStory,
        acceptanceCriteria: [...editedStory.acceptanceCriteria, newAcInput.trim()],
      });
      setNewAcInput("");
    }
  };

  const handleRemoveAc = (acIndex: number) => {
    if (editedStory) {
      setEditedStory({
        ...editedStory,
        acceptanceCriteria: editedStory.acceptanceCriteria.filter((_, i) => i !== acIndex),
      });
    }
  };

  const handleUpdateAc = (acIndex: number, value: string) => {
    if (editedStory) {
      const updated = [...editedStory.acceptanceCriteria];
      updated[acIndex] = value;
      setEditedStory({ ...editedStory, acceptanceCriteria: updated });
    }
  };

  const handleDeleteStory = (index: number) => {
    setGeneratedStories(prev => prev.filter((_, i) => i !== index));
    // Adjust saved indices after deletion
    setSavedStoryIndices(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
    setDeleteConfirmIndex(null);
    toast.success("Story removed");
  };

  const handleToggleSelect = (index: number) => {
    setSelectedStories(prev => {
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
    const unsavedIndices = generatedStories
      .map((_, idx) => idx)
      .filter(idx => !savedStoryIndices.has(idx));
    setSelectedStories(new Set(unsavedIndices));
  };

  const handleDeselectAll = () => {
    setSelectedStories(new Set());
  };

  const handleBulkSave = async () => {
    if (!currentWorkspaceId || !currentProjectId || selectedStories.size === 0) return;

    setIsBulkSaving(true);
    const indicesToSave = Array.from(selectedStories).filter(idx => !savedStoryIndices.has(idx));
    let savedCount = 0;

    try {
      for (const idx of indicesToSave) {
        const story = generatedStories[idx];
        const markdown = convertStoryToMarkdown(story);

        const artifact = await createArtifact.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          type: "STORY",
          title: story.title,
          contentMarkdown: markdown,
          contentJson: story,
        });

        if (sourcePrdArtifact && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: sourcePrdArtifact.id,
            toArtifactId: artifact.id,
            edgeType: "DERIVES_FROM",
            source: "AI_INFERRED",
            sourceRef: "story-generator",
            metadata: { generatedFrom: "prd" },
          });
        }

        // Create edge to Epic if assigned
        const epicId = storyEpicAssignments[idx];
        if (epicId && artifact) {
          await createEdge.mutateAsync({
            workspaceId: currentWorkspaceId,
            projectId: currentProjectId,
            fromArtifactId: epicId,
            toArtifactId: artifact.id,
            edgeType: "CONTAINS",
            source: "USER_ASSIGNED",
            sourceRef: "story-generator",
            metadata: { linkedVia: "epic-selector" },
          });
        }

        setSavedStoryIndices(prev => new Set(prev).add(idx));
        savedCount++;
      }

      toast.success(`Saved ${savedCount} stories`);
      setSelectedStories(new Set());
    } catch (error) {
      toast.error("Failed to save some stories");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkDelete = () => {
    const indicesToDelete = Array.from(selectedStories).sort((a, b) => b - a); // Sort descending
    
    let newStories = [...generatedStories];
    let newSavedIndices = new Set(savedStoryIndices);
    
    for (const idx of indicesToDelete) {
      newStories = newStories.filter((_, i) => i !== idx);
      // Adjust saved indices
      const adjustedSaved = new Set<number>();
      newSavedIndices.forEach(i => {
        if (i < idx) adjustedSaved.add(i);
        else if (i > idx) adjustedSaved.add(i - 1);
      });
      newSavedIndices = adjustedSaved;
    }

    setGeneratedStories(newStories);
    setSavedStoryIndices(newSavedIndices);
    setSelectedStories(new Set());
    setShowBulkDeleteConfirm(false);
    toast.success(`Removed ${indicesToDelete.length} stories`);
  };

  // Refine story with AI
  const handleOpenRefineDialog = (index: number) => {
    setRefiningStoryIndex(index);
    setRefineFeedback("");
    setShowRefineDialog(true);
  };

  const handleCloseRefineDialog = () => {
    setShowRefineDialog(false);
    setRefiningStoryIndex(null);
    setRefineFeedback("");
  };

  const handleRefineStory = async () => {
    if (refiningStoryIndex === null || !refineFeedback.trim()) {
      toast.error("Please provide feedback for refinement");
      return;
    }

    const storyToRefine = generatedStories[refiningStoryIndex];
    setIsRefining(true);

    try {
      // Build the request body with full context
      const requestBody: Record<string, unknown> = {
        action: "refine",
        storyToRefine: storyToRefine,
        refineFeedback: refineFeedback.trim(),
        attachedFiles: attachedFileContents,
      };

      // Add Epic-specific context if generating from an Epic
      if (isSourceEpic && sourceArtifact) {
        requestBody.epicContent = getEpicContent();
        requestBody.epicTitle = sourceArtifact.title;
        requestBody.parentPrdContent = getParentPrdContent();
        requestBody.parentPrdTitle = parentPrdArtifact?.title || null;
        requestBody.parentPrdFiles = parentPrdFileContents;
      } else if (sourcePrdArtifact) {
        // PRD-based context
        const prdText = getPrdText();
        requestBody.prdContent = prdText;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to refine story");
      }

      const data = await response.json();

      if (data.refinedStory) {
        // Update the story at the refining index
        const updated = [...generatedStories];
        updated[refiningStoryIndex] = data.refinedStory;
        setGeneratedStories(updated);
        toast.success("Story refined successfully");
        handleCloseRefineDialog();
      } else {
        throw new Error("No refined story in response");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refine story");
    } finally {
      setIsRefining(false);
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
    setGeneratedStories([]);
    setSourcePrdArtifact(sourceArtifact);
    setSavedStoryIndices(new Set());
    setEditingStoryIndex(null);
    setEditedStory(null);
    setSelectedStories(new Set());
  };

  const availablePrds = prdArtifacts || [];
  const hasExistingPrds = availablePrds.length > 0;
  const availableEpics = epicArtifacts || [];
  const hasExistingEpics = availableEpics.length > 0;
  const canSubmitPrd = prdSource === "new" ? prdContent.trim().length > 0 : selectedPrdId.length > 0;

  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="space-y-6">
      {/* Epic Context Indicator - Show when generating from Epic */}
      {isSourceEpic && sourceArtifact && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <GitBranch className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generating Stories From</p>
                  <p className="font-semibold text-foreground">{sourceArtifact.title}</p>
                  <Badge variant="outline" className="mt-1 text-xs">Epic</Badge>
                </div>
                {parentPrdArtifact && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parent PRD Context</p>
                    <p className="text-sm text-foreground">{parentPrdArtifact.title}</p>
                    {attachedFileContents.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span>{attachedFileContents.length} attached file(s) included</span>
                      </div>
                    )}
                  </div>
                )}
                {!parentPrdArtifact && (
                  <p className="text-xs text-muted-foreground italic">No parent PRD linked to this Epic</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "prd" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {isSourceEpic ? <GitBranch className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span>{isSourceEpic ? "Epic" : "PRD"}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "questions" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Clarify</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "complete" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <ListChecks className="w-4 h-4" />
          <span>Stories</span>
        </div>
      </div>

      {/* PRD/Epic Phase */}
      {phase === "prd" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSourceEpic ? (
                <GitBranch className="w-5 h-5 text-accent" />
              ) : (
                <FileText className="w-5 h-5 text-accent" />
              )}
              {isSourceEpic 
                ? `Generate Stories for Epic: "${sourceArtifact?.title}"`
                : sourceArtifact 
                  ? `Generate Stories from "${sourceArtifact.title}"` 
                  : "Select or Paste PRD"}
            </CardTitle>
            <CardDescription>
              {isSourceEpic
                ? "The AI will analyze this Epic along with its parent PRD context to create detailed, implementable user stories."
                : sourceArtifact 
                  ? "The AI will analyze your PRD and ask clarifying questions to create comprehensive user stories."
                  : "Choose an existing PRD or paste content. The AI will help break it down into user stories."}
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
                  <FileText className="w-4 h-4" />
                  From Existing
                </button>
              </div>
            )}

            {/* PRD Input or Selection */}
            {(prdSource === "new" || (!hasExistingPrds && !sourceArtifact)) && !sourceArtifact && (
              <Textarea
                value={prdContent}
                onChange={(e) => setPrdContent(e.target.value)}
                placeholder="Paste your PRD content here..."
                className="min-h-[200px]"
              />
            )}

            {prdSource === "existing" && hasExistingPrds && !sourceArtifact && (
              <Select value={selectedPrdId} onValueChange={setSelectedPrdId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a PRD..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePrds.map((prd) => (
                    <SelectItem key={prd.id} value={prd.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{prd.title}</span>
                        <span className="text-xs text-muted-foreground font-mono">{prd.short_id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {sourceArtifact && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="font-medium">{sourceArtifact.title}</span>
                  <Badge variant="outline" className="text-xs">{sourceArtifact.short_id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {sourceArtifact.content_markdown?.substring(0, 200)}...
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmitPrd}
              disabled={isLoading || !canSubmitPrd}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing PRD...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Story Generation
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
              Help the AI understand your needs better by answering these questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Conversation History */}
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-4">
                {conversation.slice(0, -1).map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      msg.role === "user" ? "bg-accent/10 ml-8" : "bg-muted mr-8"
                    )}
                  >
                    {msg.content.substring(0, 200)}
                    {msg.content.length > 200 && "..."}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Current Questions */}
            {currentQuestions.length > 0 && (
              <div className="space-y-4">
                {currentQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{q.category}</Badge>
                      <span className="text-sm font-medium">{q.question}</span>
                    </div>
                    {q.options && q.options.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt, i) => (
                          <Button
                            key={i}
                            variant={answers[q.id] === opt ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAnswerChange(q.id, opt)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <Textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer..."
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmitAnswers}
                disabled={isLoading}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Answers
              </Button>
              <Button variant="outline" onClick={handleGenerateNow} disabled={isLoading}>
                Skip & Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Phase - Generated Stories */}
      {phase === "complete" && generatedStories.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Generated Stories ({generatedStories.length})
                {savedStoryIndices.size > 0 && (
                  <Badge variant="outline" className="ml-2 text-green-600">
                    {savedStoryIndices.size} saved
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review, edit, and save stories individually or all at once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Bulk Selection Bar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedStories.size > 0 && selectedStories.size === generatedStories.filter((_, i) => !savedStoryIndices.has(i)).length}
                    onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedStories.size > 0 
                      ? `${selectedStories.size} selected`
                      : "Select stories"}
                  </span>
                  {selectedStories.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Bulk Epic Assignment */}
                  {selectedStories.size > 0 && hasExistingEpics && (
                    <>
                      <Select value={selectedEpicId} onValueChange={setSelectedEpicId}>
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Assign Epic..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEpics.map((epic) => (
                            <SelectItem key={epic.id} value={epic.id}>
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{epic.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAssignEpicToSelected}
                        disabled={!selectedEpicId}
                        className="text-xs"
                      >
                        <GitBranch className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                    </>
                  )}
                  {selectedStories.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove ({selectedStories.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBulkSave}
                        disabled={isBulkSaving}
                      >
                        {isBulkSaving ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        Save ({Array.from(selectedStories).filter(i => !savedStoryIndices.has(i)).length})
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-4">
                  {generatedStories.map((story, idx) => {
                    const isEditing = editingStoryIndex === idx;
                    const isSaved = savedStoryIndices.has(idx);
                    const isSavingThis = savingStoryIndex === idx;
                    const storyToShow = isEditing && editedStory ? editedStory : story;
                    const isSelected = selectedStories.has(idx);

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-lg border bg-card",
                          isSaved && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10",
                          isSelected && !isSaved && "border-primary/50 bg-primary/5"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            {!isSaved && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(idx)}
                                className="mr-1"
                              />
                            )}
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {idx + 1}/{generatedStories.length}
                            </span>
                            {isEditing ? (
                              <Input
                                value={editedStory?.title || ""}
                                onChange={(e) => setEditedStory(prev => prev ? { ...prev, title: e.target.value } : null)}
                                className="font-medium h-8"
                              />
                            ) : (
                              <h4 className="font-medium text-foreground">{story.title}</h4>
                            )}
                            {isSaved && (
                              <Badge variant="outline" className="text-green-600 border-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Saved
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isEditing ? (
                              <Select
                                value={editedStory?.priority || "medium"}
                                onValueChange={(v) => setEditedStory(prev => prev ? { ...prev, priority: v as "high" | "medium" | "low" } : null)}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={cn("text-xs", priorityColors[story.priority])}>
                                {story.priority}
                              </Badge>
                            )}
                            {isEditing ? (
                              <Select
                                value={String(editedStory?.storyPoints || 3)}
                                onValueChange={(v) => setEditedStory(prev => prev ? { ...prev, storyPoints: parseInt(v) } : null)}
                              >
                                <SelectTrigger className="h-7 w-20 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 5, 8, 13].map(p => (
                                    <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {story.storyPoints} pts
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {isEditing ? (
                          <Textarea
                            value={editedStory?.description || ""}
                            onChange={(e) => setEditedStory(prev => prev ? { ...prev, description: e.target.value } : null)}
                            className="text-sm mb-3 min-h-[60px]"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mb-3">{story.description}</p>
                        )}

                        {/* Epic Assignment */}
                        {!isSaved && hasExistingEpics && (
                          <div className="flex items-center gap-2 mb-3">
                            <GitBranch className="w-3 h-3 text-muted-foreground" />
                            <Select
                              value={storyEpicAssignments[idx] || ""}
                              onValueChange={(val) => handleAssignEpicToStory(idx, val)}
                            >
                              <SelectTrigger className="h-7 w-[200px] text-xs">
                                <SelectValue placeholder="Link to Epic..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableEpics.map((epic) => (
                                  <SelectItem key={epic.id} value={epic.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="truncate max-w-[150px]">{epic.title}</span>
                                      <span className="text-xs text-muted-foreground">{epic.short_id}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {storyEpicAssignments[idx] && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRemoveEpicAssignment(idx)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        {isSaved && storyEpicAssignments[idx] && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <GitBranch className="w-3 h-3" />
                            <span className="font-medium">Epic:</span>
                            <span>{getEpicArtifact(storyEpicAssignments[idx])?.title || storyEpicAssignments[idx]}</span>
                          </div>
                        )}
                        {storyToShow.epic && !storyEpicAssignments[idx] && (
                          <div className="text-xs text-muted-foreground mb-2">
                            <span className="font-medium">Epic (from AI):</span> {storyToShow.epic}
                          </div>
                        )}

                        {/* Acceptance Criteria */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs font-medium mb-2 flex items-center gap-1">
                            <ListChecks className="w-3 h-3" />
                            Acceptance Criteria ({storyToShow.acceptanceCriteria.length})
                          </div>
                          <ul className="space-y-1.5">
                            {storyToShow.acceptanceCriteria.map((ac, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                {isEditing ? (
                                  <>
                                    <Input
                                      value={ac}
                                      onChange={(e) => handleUpdateAc(i, e.target.value)}
                                      className="h-7 text-xs flex-1"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => handleRemoveAc(i)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                                    <span>{ac}</span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                          {isEditing && (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                value={newAcInput}
                                onChange={(e) => setNewAcInput(e.target.value)}
                                placeholder="Add acceptance criteria..."
                                className="h-7 text-xs flex-1"
                                onKeyDown={(e) => e.key === "Enter" && handleAddAc()}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7"
                                onClick={handleAddAc}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Story Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Apply Changes
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmIndex(idx)}
                                disabled={isSaved}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(idx)}
                                disabled={isSaved}
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRefineDialog(idx)}
                                disabled={isSaved}
                                className="text-accent hover:text-accent"
                              >
                                <Wand2 className="w-3 h-3 mr-1" />
                                Refine with AI
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveSingleStory(idx)}
                                disabled={isSaved || isSavingThis}
                                className={isSaved ? "bg-green-600" : ""}
                              >
                                {isSavingThis ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3 mr-1" />
                                )}
                                {isSaved ? "Saved" : "Save Story"}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={handleSaveStories}
              disabled={isSaving || savedStoryIndices.size === generatedStories.length}
              className="bg-accent hover:bg-accent/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : savedStoryIndices.size === generatedStories.length ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  All Saved
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Remaining ({generatedStories.length - savedStoryIndices.size})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Story?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteConfirmIndex !== null ? generatedStories[deleteConfirmIndex]?.title : ''}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmIndex !== null && handleDeleteStory(deleteConfirmIndex)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedStories.size} Stories?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedStories.size} selected stories? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refine Story with AI Dialog */}
      <Dialog open={showRefineDialog} onOpenChange={(open) => !open && handleCloseRefineDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              Refine Story with AI
            </DialogTitle>
            <DialogDescription>
              Provide feedback to refine this story. The AI will use the Epic/PRD context to improve it.
            </DialogDescription>
          </DialogHeader>
          
          {refiningStoryIndex !== null && generatedStories[refiningStoryIndex] && (
            <div className="space-y-4">
              {/* Current Story Preview */}
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Current Story</p>
                <p className="font-medium text-sm">{generatedStories[refiningStoryIndex].title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {generatedStories[refiningStoryIndex].description}
                </p>
              </div>

              {/* Context Indicator */}
              {(isSourceEpic || sourcePrdArtifact) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isSourceEpic ? (
                    <GitBranch className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span>
                    Using context from: {isSourceEpic ? sourceArtifact?.title : sourcePrdArtifact?.title}
                    {isSourceEpic && parentPrdArtifact && ` + ${parentPrdArtifact.title}`}
                  </span>
                </div>
              )}

              {/* Feedback Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Feedback</label>
                <Textarea
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder="Describe how you'd like this story to be refined...

Examples:
• Make the acceptance criteria more specific
• Add error handling scenarios
• Focus more on the admin user perspective
• Break this into smaller stories"
                  className="min-h-[120px]"
                />
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick refinements:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "More detailed acceptance criteria",
                    "Add edge cases",
                    "Simplify scope",
                    "Add technical details",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setRefineFeedback(prev => 
                        prev ? `${prev}\n• ${suggestion}` : suggestion
                      )}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRefineDialog} disabled={isRefining}>
              Cancel
            </Button>
            <Button 
              onClick={handleRefineStory} 
              disabled={isRefining || !refineFeedback.trim()}
              className="bg-accent hover:bg-accent/90"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Refine Story
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
