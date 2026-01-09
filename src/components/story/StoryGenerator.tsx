import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateArtifact, useArtifacts, Artifact } from "@/hooks/useArtifacts";
import { useCreateArtifactEdge } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const { data: artifacts } = useArtifacts(currentProjectId || undefined, "PRD");

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

  const callStoryGenerator = async (
    prd: string | null,
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`,
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
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate stories");
    }

    return response.json();
  };

  const handleSubmitPrd = async () => {
    const prd = getPrdText();
    if (!prd) {
      toast.error("Please enter PRD content or select an existing PRD");
      return;
    }

    setIsLoading(true);
    try {
      const data = await callStoryGenerator(prd, []);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          { role: "user", content: prd },
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
      for (const story of generatedStories) {
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
      }

      toast.success(`Created ${createdIds.length} stories successfully`);

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
  };

  const prdArtifacts = artifacts || [];
  const hasExistingPrds = prdArtifacts.length > 0;
  const canSubmitPrd = prdSource === "new" ? prdContent.trim().length > 0 : selectedPrdId.length > 0;

  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "prd" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>PRD</span>
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

      {/* PRD Phase */}
      {phase === "prd" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              {sourceArtifact ? `Generate Stories from "${sourceArtifact.title}"` : "Select or Paste PRD"}
            </CardTitle>
            <CardDescription>
              {sourceArtifact 
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
                  {prdArtifacts.map((prd) => (
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
                Generated Stories
              </CardTitle>
              <CardDescription>
                {generatedStories.length} stories generated. Review and save them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {generatedStories.map((story, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-medium text-foreground">{story.title}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={cn("text-xs", priorityColors[story.priority])}>
                            {story.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {story.storyPoints} pts
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{story.description}</p>
                      {story.epic && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Epic: {story.epic}
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="font-medium">Acceptance Criteria:</span>
                        <ul className="list-disc list-inside mt-1 text-muted-foreground">
                          {story.acceptanceCriteria.slice(0, 3).map((ac, i) => (
                            <li key={i}>{ac}</li>
                          ))}
                          {story.acceptanceCriteria.length > 3 && (
                            <li className="text-accent">+{story.acceptanceCriteria.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
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
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save All Stories ({generatedStories.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
