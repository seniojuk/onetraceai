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
  Wand2,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateArtifact, Artifact } from "@/hooks/useArtifacts";
import { useCreateArtifactVersion } from "@/hooks/useArtifactVersions";
import { useUIStore } from "@/store/uiStore";
import { useFilesForArtifact, FileArtifact } from "@/hooks/useFileArtifacts";
import { supabase } from "@/integrations/supabase/client";
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

interface PRDEnhancerProps {
  artifact: Artifact;
  onComplete?: () => void;
  onCancel?: () => void;
}

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

export const PRDEnhancer = ({ artifact, onComplete, onCancel }: PRDEnhancerProps) => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const updateArtifact = useUpdateArtifact();
  const createVersion = useCreateArtifactVersion();

  // Fetch attached files
  const { data: attachedFiles } = useFilesForArtifact(artifact.id, currentProjectId || undefined);

  const [phase, setPhase] = useState<"enhancement" | "questions" | "complete">("enhancement");
  const [enhancementDetails, setEnhancementDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enhancedPRD, setEnhancedPRD] = useState<PRDData | null>(null);
  const [changesSummary, setChangesSummary] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [attachedFileContents, setAttachedFileContents] = useState<Array<{ name: string; type: string; content: string }>>([]);

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
          // Limit content to prevent token overflow
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

  const callPRDEnhancer = async (
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-prd`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          existingPrd: artifact.content_markdown,
          enhancementDetails: enhancementDetails,
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
      throw new Error(errorData.error || "Failed to enhance PRD");
    }

    return response.json();
  };

  const handleSubmitEnhancement = async () => {
    if (!enhancementDetails.trim()) {
      toast.error("Please describe what you'd like to enhance");
      return;
    }

    setIsLoading(true);
    try {
      const data = await callPRDEnhancer([]);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          {
            role: "user",
            content: `Enhancement request: ${enhancementDetails}`,
          },
          {
            role: "assistant",
            content: data.summary || "I have some questions to help improve the PRD.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
        setPhase("questions");
      } else if (data.phase === "complete" && data.prd) {
        setEnhancedPRD(data.prd);
        setChangesSummary(data.changesSummary || "");
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start PRD enhancement");
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
        {
          role: "user",
          content: answerText,
        },
      ];

      setConversation(newConversation);
      setAnswers({});

      const data = await callPRDEnhancer(newConversation);

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
        setEnhancedPRD(data.prd);
        setChangesSummary(data.changesSummary || "");
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: "I've enhanced your PRD based on our conversation.",
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

      const data = await callPRDEnhancer(newConversation, "generate");

      if (data.phase === "complete" && data.prd) {
        setEnhancedPRD(data.prd);
        setChangesSummary(data.changesSummary || "");
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enhance PRD");
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

  const handleSaveEnhancedPRD = async () => {
    if (!enhancedPRD || !currentWorkspaceId || !currentProjectId) {
      toast.error("Missing required data");
      return;
    }

    setIsSaving(true);
    try {
      // First, save the current version to version history
      await createVersion.mutateAsync({
        artifactId: artifact.id,
        workspaceId: currentWorkspaceId,
        projectId: currentProjectId,
        title: artifact.title,
        contentMarkdown: artifact.content_markdown || undefined,
        contentJson: artifact.content_json || undefined,
        enhancementDetails: enhancementDetails,
      });

      // Then update the artifact with the enhanced PRD
      const markdown = convertPRDToMarkdown(enhancedPRD);

      await updateArtifact.mutateAsync({
        id: artifact.id,
        title: enhancedPRD.title,
        contentMarkdown: markdown,
        contentJson: enhancedPRD,
      });

      toast.success("PRD enhanced successfully");
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(`/artifacts/${artifact.id}`);
      }
    } catch (error) {
      toast.error("Failed to save enhanced PRD");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPhase("enhancement");
    setEnhancementDetails("");
    setConversation([]);
    setCurrentQuestions([]);
    setAnswers({});
    setEnhancedPRD(null);
    setChangesSummary("");
  };

  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            phase === "enhancement" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Wand2 className="w-4 h-4" />
          <span>Enhance</span>
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
          <span>Updated PRD</span>
        </div>
      </div>

      {/* Enhancement Phase */}
      {phase === "enhancement" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              Enhance "{artifact.title}"
            </CardTitle>
            <CardDescription>
              Describe the improvements or additional details you want to incorporate into this PRD.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                What would you like to enhance or improve?
              </label>
              <Textarea
                value={enhancementDetails}
                onChange={(e) => setEnhancementDetails(e.target.value)}
                placeholder="e.g., Add more detailed user personas, expand the feature list to include mobile support, clarify the technical requirements for API integrations..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmitEnhancement}
                disabled={isLoading || !enhancementDetails.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Start Enhancement
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Phase */}
      {phase === "questions" && (
        <div className="space-y-6">
          {/* Conversation History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent" />
                Clarifying Questions
              </CardTitle>
              <CardDescription>
                Answer these questions to help generate a better enhanced PRD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 rounded-lg",
                        msg.role === "user"
                          ? "bg-accent/10 ml-8"
                          : "bg-muted mr-8"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                          {msg.role === "user" ? "You" : "AI"}
                        </Badge>
                      </div>
                      {msg.summary && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {msg.summary}
                        </p>
                      )}
                      {!msg.questions && (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Please Answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <label className="text-sm font-medium flex items-start gap-2">
                    <span className="bg-accent text-accent-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </label>
                  {q.options && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-7">
                      {q.options.map((opt) => (
                        <Badge
                          key={opt}
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
                    placeholder="Type your answer..."
                    className="ml-7 w-[calc(100%-1.75rem)]"
                  />
                </div>
              ))}

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleSubmitAnswers}
                  disabled={isLoading}
                  className="bg-accent hover:bg-accent/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Answers
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateNow}
                  disabled={isLoading}
                >
                  Skip & Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Phase */}
      {phase === "complete" && enhancedPRD && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Enhanced PRD Ready
                  </CardTitle>
                  <CardDescription>
                    Review the enhanced PRD below. Save to update the artifact and keep the previous version in history.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                  <Button
                    onClick={handleSaveEnhancedPRD}
                    disabled={isSaving}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Save Enhanced PRD
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {changesSummary && (
                <div className="mb-4 p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Changes Summary:</p>
                  <p className="text-sm text-muted-foreground">{changesSummary}</p>
                </div>
              )}
              <ScrollArea className="h-[500px] border rounded-lg p-4">
                <div className="prose prose-sm max-w-none">
                  <h1>{enhancedPRD.title}</h1>
                  <h2>Overview</h2>
                  <p>{enhancedPRD.overview}</p>
                  <h2>Problem Statement</h2>
                  <p>{enhancedPRD.problemStatement}</p>

                  {enhancedPRD.targetUsers && enhancedPRD.targetUsers.length > 0 && (
                    <>
                      <h2>Target Users</h2>
                      {enhancedPRD.targetUsers.map((user, idx) => (
                        <div key={idx}>
                          <h3>{user.persona}</h3>
                          <p>{user.description}</p>
                          {user.painPoints && user.painPoints.length > 0 && (
                            <>
                              <strong>Pain Points:</strong>
                              <ul>
                                {user.painPoints.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {enhancedPRD.goals && enhancedPRD.goals.length > 0 && (
                    <>
                      <h2>Goals</h2>
                      <ul>
                        {enhancedPRD.goals.map((g, idx) => (
                          <li key={idx}>
                            <strong>[{g.type}]</strong> {g.goal} — <em>Metric:</em> {g.metric}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {enhancedPRD.features && enhancedPRD.features.length > 0 && (
                    <>
                      <h2>Features</h2>
                      {enhancedPRD.features.map((f, idx) => (
                        <div key={idx}>
                          <h3>{f.name}</h3>
                          <p>
                            <strong>Priority:</strong> {f.priority.replace("_", " ")}
                          </p>
                          <p>{f.description}</p>
                          {f.userStories && f.userStories.length > 0 && (
                            <>
                              <strong>User Stories:</strong>
                              <ul>
                                {f.userStories.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {enhancedPRD.successCriteria && enhancedPRD.successCriteria.length > 0 && (
                    <>
                      <h2>Success Criteria</h2>
                      <ul>
                        {enhancedPRD.successCriteria.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
