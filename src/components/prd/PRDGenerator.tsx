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
  Lightbulb,
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
import { AIRunLimitWarning, useAIRunLimit } from "@/components/billing/AIRunLimitWarning";

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

interface PRDData {
  title: string;
  overview: string;
  problemStatement: string;
  targetUsers: Array<{
    persona: string;
    description: string;
    painPoints: string[];
  }>;
  goals: Array<{
    type: string;
    goal: string;
    metric: string;
  }>;
  features: Array<{
    name: string;
    description: string;
    priority: string;
    userStories: string[];
  }>;
  nonFunctionalRequirements: {
    performance?: string;
    security?: string;
    scalability?: string;
    accessibility?: string;
  };
  constraints: string[];
  assumptions: string[];
  outOfScope: string[];
  timeline?: string;
  successCriteria: string[];
}

interface PRDGeneratorProps {
  onComplete?: (artifactId: string) => void;
  initialIdea?: string;
  sourceArtifact?: Artifact;
}

export const PRDGenerator = ({ onComplete, initialIdea, sourceArtifact }: PRDGeneratorProps) => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const createArtifact = useCreateArtifact();
  const createEdge = useCreateArtifactEdge();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined, "IDEA");
  const { canRunAI, isAtLimit } = useAIRunLimit();

  const [phase, setPhase] = useState<"idea" | "questions" | "complete">("idea");
  const [ideaSource, setIdeaSource] = useState<"new" | "existing">(sourceArtifact ? "existing" : "new");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>(sourceArtifact?.id || "");
  const [idea, setIdea] = useState(initialIdea || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedPRD, setGeneratedPRD] = useState<PRDData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sourceIdeaArtifact, setSourceIdeaArtifact] = useState<Artifact | undefined>(sourceArtifact);

  // Get idea text from selected artifact
  const getIdeaText = (): string => {
    if (ideaSource === "new") {
      return idea.trim();
    }
    const selectedArtifact = artifacts?.find(a => a.id === selectedIdeaId);
    if (selectedArtifact) {
      setSourceIdeaArtifact(selectedArtifact);
      // Combine title and content for richer context
      const parts = [selectedArtifact.title];
      if (selectedArtifact.content_markdown) {
        parts.push(selectedArtifact.content_markdown);
      }
      return parts.join("\n\n");
    }
    return "";
  };

  const callPRDGenerator = async (
    ideaText: string | null,
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prd`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          idea: ideaText,
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
      throw new Error(errorData.error || "Failed to generate PRD");
    }

    return response.json();
  };

  const handleSubmitIdea = async () => {
    if (isAtLimit) {
      toast.error("You've reached your AI run limit. Please upgrade your plan to continue.");
      return;
    }
    
    const ideaText = getIdeaText();
    if (!ideaText) {
      toast.error("Please enter an idea or select an existing one");
      return;
    }

    setIsLoading(true);
    try {
      const data = await callPRDGenerator(ideaText, []);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          {
            role: "user",
            content: ideaText,
          },
          {
            role: "assistant",
            content: data.summary || "I have some questions to help create a comprehensive PRD.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
        setPhase("questions");
      } else if (data.phase === "complete" && data.prd) {
        setGeneratedPRD(data.prd);
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start PRD generation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAnswers = async () => {
    // Build the answer text
    const answerText = currentQuestions
      .map((q) => `**${q.question}**\n${answers[q.id] || "No answer provided"}`)
      .join("\n\n");

    setIsLoading(true);
    try {
      const newConversation: ConversationMessage[] = [
        ...conversation,
        {
          role: "user",
          content: answerText,
        },
      ];

      setConversation(newConversation);
      setAnswers({});

      const data = await callPRDGenerator(null, newConversation);

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
      } else if (data.phase === "complete" && data.prd) {
        setGeneratedPRD(data.prd);
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: "I've generated your PRD based on our conversation.",
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
      // Build partial answers if any
      const answerText = currentQuestions
        .filter((q) => answers[q.id])
        .map((q) => `**${q.question}**\n${answers[q.id]}`)
        .join("\n\n");

      const newConversation: ConversationMessage[] = answerText
        ? [...conversation, { role: "user", content: answerText }]
        : conversation;

      const data = await callPRDGenerator(null, newConversation, "generate");

      if (data.phase === "complete" && data.prd) {
        setGeneratedPRD(data.prd);
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PRD");
    } finally {
      setIsLoading(false);
    }
  };

  const convertPRDToMarkdown = (prd: PRDData): string => {
    let md = `# ${prd.title}\n\n`;
    md += `## Overview\n${prd.overview}\n\n`;
    md += `## Problem Statement\n${prd.problemStatement}\n\n`;

    if (prd.targetUsers && prd.targetUsers.length > 0) {
      md += `## Target Users\n`;
      for (const user of prd.targetUsers) {
        md += `### ${user.persona}\n`;
        md += `${user.description}\n\n`;
        if (user.painPoints && user.painPoints.length > 0) {
          md += `**Pain Points:**\n`;
          for (const pain of user.painPoints) {
            md += `- ${pain}\n`;
          }
          md += "\n";
        }
      }
    }

    if (prd.goals && prd.goals.length > 0) {
      md += `## Goals\n`;
      for (const goal of prd.goals) {
        md += `- **[${goal.type}]** ${goal.goal}\n  - *Metric:* ${goal.metric}\n`;
      }
      md += "\n";
    }

    if (prd.features && prd.features.length > 0) {
      md += `## Features\n`;
      for (const feature of prd.features) {
        md += `### ${feature.name}\n`;
        md += `**Priority:** ${feature.priority.replace("_", " ")}\n\n`;
        md += `${feature.description}\n\n`;
        if (feature.userStories && feature.userStories.length > 0) {
          md += `**User Stories:**\n`;
          for (const story of feature.userStories) {
            md += `- ${story}\n`;
          }
          md += "\n";
        }
      }
    }

    if (prd.nonFunctionalRequirements) {
      md += `## Non-Functional Requirements\n`;
      const nfr = prd.nonFunctionalRequirements;
      if (nfr.performance) md += `- **Performance:** ${nfr.performance}\n`;
      if (nfr.security) md += `- **Security:** ${nfr.security}\n`;
      if (nfr.scalability) md += `- **Scalability:** ${nfr.scalability}\n`;
      if (nfr.accessibility) md += `- **Accessibility:** ${nfr.accessibility}\n`;
      md += "\n";
    }

    if (prd.constraints && prd.constraints.length > 0) {
      md += `## Constraints\n`;
      for (const c of prd.constraints) {
        md += `- ${c}\n`;
      }
      md += "\n";
    }

    if (prd.assumptions && prd.assumptions.length > 0) {
      md += `## Assumptions\n`;
      for (const a of prd.assumptions) {
        md += `- ${a}\n`;
      }
      md += "\n";
    }

    if (prd.outOfScope && prd.outOfScope.length > 0) {
      md += `## Out of Scope\n`;
      for (const o of prd.outOfScope) {
        md += `- ${o}\n`;
      }
      md += "\n";
    }

    if (prd.timeline) {
      md += `## Timeline\n${prd.timeline}\n\n`;
    }

    if (prd.successCriteria && prd.successCriteria.length > 0) {
      md += `## Success Criteria\n`;
      for (const s of prd.successCriteria) {
        md += `- ${s}\n`;
      }
    }

    return md;
  };

  const handleSavePRD = async () => {
    if (!generatedPRD || !currentWorkspaceId || !currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setIsSaving(true);
    try {
      const markdown = convertPRDToMarkdown(generatedPRD);

      const artifact = await createArtifact.mutateAsync({
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        type: "PRD",
        title: generatedPRD.title,
        contentMarkdown: markdown,
        contentJson: generatedPRD,
      });

      // Create edge to source idea if we have one
      if (sourceIdeaArtifact && artifact) {
        await createEdge.mutateAsync({
          workspaceId: currentWorkspaceId,
          projectId: currentProjectId,
          fromArtifactId: sourceIdeaArtifact.id,
          toArtifactId: artifact.id,
          edgeType: "DERIVES_FROM",
          source: "AI_INFERRED",
          sourceRef: "prd-generator",
          metadata: { generatedFrom: "idea" },
        });
      }

      toast.success(`PRD "${generatedPRD.title}" created successfully`);

      if (onComplete) {
        onComplete(artifact.id);
      } else {
        navigate(`/artifacts/${artifact.id}`);
      }
    } catch (error) {
      toast.error("Failed to save PRD");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPhase("idea");
    setIdea(initialIdea || "");
    setSelectedIdeaId(sourceArtifact?.id || "");
    setIdeaSource(sourceArtifact ? "existing" : "new");
    setConversation([]);
    setCurrentQuestions([]);
    setAnswers({});
    setGeneratedPRD(null);
    setSourceIdeaArtifact(sourceArtifact);
  };

  const ideaArtifacts = artifacts || [];
  const hasExistingIdeas = ideaArtifacts.length > 0;
  const canSubmitIdea = ideaSource === "new" ? idea.trim().length > 0 : selectedIdeaId.length > 0;

  return (
    <div className="space-y-6">
      {/* AI Run Limit Warning */}
      <AIRunLimitWarning />

      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "idea" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Idea</span>
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
          <FileText className="w-4 h-4" />
          <span>PRD</span>
        </div>
      </div>

      {/* Idea Phase */}
      {phase === "idea" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              {sourceArtifact ? `Generate PRD from "${sourceArtifact.title}"` : "Describe Your Product Idea"}
            </CardTitle>
            <CardDescription>
              {sourceArtifact 
                ? "The AI will analyze your idea and ask clarifying questions to create a comprehensive PRD."
                : "Share your product concept or select an existing idea. The AI will help you develop it into a PRD."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Idea Source Toggle (only show if not coming from a source artifact and has existing ideas) */}
            {!sourceArtifact && hasExistingIdeas && (
              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setIdeaSource("new")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    ideaSource === "new"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  New Idea
                </button>
                <button
                  type="button"
                  onClick={() => setIdeaSource("existing")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    ideaSource === "existing"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  From Existing Idea
                </button>
              </div>
            )}

            {/* New Idea Input */}
            {ideaSource === "new" && !sourceArtifact && (
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your product idea... What problem does it solve? Who is it for? What are the key features?"
                className="min-h-[200px]"
              />
            )}

            {/* Existing Idea Selector */}
            {ideaSource === "existing" && !sourceArtifact && (
              <div className="space-y-3">
                <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an existing idea..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ideaArtifacts.map((artifact) => (
                      <SelectItem key={artifact.id} value={artifact.id}>
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-accent" />
                          <span>{artifact.title}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {artifact.short_id}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedIdeaId && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      {ideaArtifacts.find(a => a.id === selectedIdeaId)?.content_markdown || 
                       "No description available for this idea."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Source Artifact Preview */}
            {sourceArtifact && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-accent" />
                  <span className="font-medium">{sourceArtifact.title}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {sourceArtifact.short_id}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sourceArtifact.content_markdown || "No description available."}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitIdea}
                disabled={!canSubmitIdea || isLoading || isAtLimit}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Start PRD Generation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Phase */}
      {phase === "questions" && (
        <div className="space-y-4">
          {/* Conversation History */}
          {conversation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-4">
                    {conversation.slice(0, -1).map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          msg.role === "user"
                            ? "bg-accent/10 ml-8"
                            : "bg-muted mr-8"
                        )}
                      >
                        <p className="font-medium mb-1 text-xs text-muted-foreground">
                          {msg.role === "user" ? "You" : "AI Assistant"}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Current Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent" />
                Clarifying Questions
              </CardTitle>
              <CardDescription>
                {conversation[conversation.length - 1]?.summary ||
                  "Please answer these questions to help create a better PRD"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <label className="font-medium text-sm flex items-start gap-2">
                    <span className="text-accent">{idx + 1}.</span>
                    {q.question}
                  </label>
                  {q.options && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {q.options.map((opt, optIdx) => (
                        <Badge
                          key={optIdx}
                          variant={answers[q.id] === opt ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleAnswerChange(q.id, opt)}
                        >
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer..."
                    className="min-h-[80px]"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleGenerateNow} disabled={isLoading}>
                  Skip & Generate PRD
                </Button>
                <Button
                  onClick={handleSubmitAnswers}
                  disabled={
                    isLoading || Object.keys(answers).length < currentQuestions.length / 2
                  }
                  className="bg-accent hover:bg-accent/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Answers
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Phase - PRD Preview */}
      {phase === "complete" && generatedPRD && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                {generatedPRD.title}
              </CardTitle>
              <CardDescription>{generatedPRD.overview}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* Problem Statement */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      Problem Statement
                    </h3>
                    <p className="text-sm">{generatedPRD.problemStatement}</p>
                  </div>

                  {/* Target Users */}
                  {generatedPRD.targetUsers && generatedPRD.targetUsers.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                        Target Users
                      </h3>
                      <div className="space-y-3">
                        {generatedPRD.targetUsers.map((user, idx) => (
                          <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                            <p className="font-medium">{user.persona}</p>
                            <p className="text-sm text-muted-foreground">{user.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {generatedPRD.features && generatedPRD.features.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                        Features
                      </h3>
                      <div className="space-y-3">
                        {generatedPRD.features.map((feature, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium">{feature.name}</p>
                              <Badge
                                variant={
                                  feature.priority === "must_have"
                                    ? "default"
                                    : feature.priority === "should_have"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {feature.priority.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals */}
                  {generatedPRD.goals && generatedPRD.goals.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Goals</h3>
                      <ul className="space-y-2">
                        {generatedPRD.goals.map((goal, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0">
                              {goal.type}
                            </Badge>
                            <span>{goal.goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Success Criteria */}
                  {generatedPRD.successCriteria && generatedPRD.successCriteria.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                        Success Criteria
                      </h3>
                      <ul className="list-disc list-inside space-y-1">
                        {generatedPRD.successCriteria.map((criteria, idx) => (
                          <li key={idx} className="text-sm">
                            {criteria}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={handleSavePRD}
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Save PRD as Artifact
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
