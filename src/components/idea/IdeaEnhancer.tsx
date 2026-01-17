import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Loader2,
  MessageCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Wand2,
  Paperclip,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateArtifact, Artifact } from "@/hooks/useArtifacts";
import { useCreateArtifactVersion } from "@/hooks/useArtifactVersions";
import { useFilesForArtifact, FileArtifact } from "@/hooks/useFileArtifacts";
import { supabase } from "@/integrations/supabase/client";
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

interface IdeaData {
  title: string;
  summary: string;
  problemStatement: string;
  targetAudience: Array<{
    segment: string;
    description: string;
    needs: string[];
  }>;
  valueProposition: string;
  keyFeatures: Array<{
    feature: string;
    benefit: string;
  }>;
  differentiators: string[];
  successMetrics: string[];
  risks: string[];
  nextSteps: string[];
}

interface AttachedFileContent {
  fileName: string;
  fileType: string;
  content: string;
}

interface IdeaEnhancerProps {
  artifact: Artifact;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const IdeaEnhancer = ({ artifact, onComplete, onCancel }: IdeaEnhancerProps) => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId } = useUIStore();
  const updateArtifact = useUpdateArtifact();
  const createVersion = useCreateArtifactVersion();

  const [phase, setPhase] = useState<"enhancement" | "questions" | "complete">("enhancement");
  const [enhancementDetails, setEnhancementDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enhancedIdea, setEnhancedIdea] = useState<IdeaData | null>(null);
  const [changesSummary, setChangesSummary] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [attachedFileContents, setAttachedFileContents] = useState<AttachedFileContent[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Fetch attached files for this artifact
  const { data: attachedFiles } = useFilesForArtifact(artifact.id, artifact.project_id);

  // Check if file type is text-extractable
  const isTextExtractable = (fileType: string, fileName: string): boolean => {
    const textMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'text/xml',
      'application/json',
      'application/xml',
    ];
    const textExtensions = ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm', '.log', '.yaml', '.yml'];
    
    if (textMimeTypes.includes(fileType)) return true;
    const lowerName = fileName.toLowerCase();
    return textExtensions.some(ext => lowerName.endsWith(ext));
  };

  // Extract text content from attached files
  useEffect(() => {
    const extractFileContents = async () => {
      if (!attachedFiles || attachedFiles.length === 0) {
        setAttachedFileContents([]);
        return;
      }

      setIsLoadingFiles(true);
      const contents: AttachedFileContent[] = [];

      for (const file of attachedFiles) {
        const { file_name, file_type, storage_path } = file.content_json;
        
        if (isTextExtractable(file_type, file_name)) {
          try {
            const { data, error } = await supabase.storage
              .from('artifact-files')
              .download(storage_path);
            
            if (error) {
              console.error(`Failed to download file ${file_name}:`, error);
              continue;
            }

            const text = await data.text();
            // Limit content to prevent token overflow (max ~10k chars per file)
            const truncatedContent = text.length > 10000 
              ? text.substring(0, 10000) + '\n\n[... content truncated ...]'
              : text;

            contents.push({
              fileName: file_name,
              fileType: file_type,
              content: truncatedContent,
            });
          } catch (err) {
            console.error(`Error extracting content from ${file_name}:`, err);
          }
        }
      }

      setAttachedFileContents(contents);
      setIsLoadingFiles(false);
    };

    extractFileContents();
  }, [attachedFiles]);

  const callIdeaEnhancer = async (
    conversationHistory: ConversationMessage[],
    action?: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-idea`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          existingIdea: artifact.content_markdown || artifact.title,
          enhancementDetails: enhancementDetails,
          attachedFiles: attachedFileContents,
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
      throw new Error(errorData.error || "Failed to enhance idea");
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
      const data = await callIdeaEnhancer([]);

      if (data.phase === "questions" && data.questions) {
        setCurrentQuestions(data.questions);
        setConversation([
          {
            role: "user",
            content: `Enhancement request: ${enhancementDetails}`,
          },
          {
            role: "assistant",
            content: data.summary || "I have some questions to help refine your idea.",
            questions: data.questions,
            summary: data.summary,
          },
        ]);
        setPhase("questions");
      } else if (data.phase === "complete" && data.idea) {
        setEnhancedIdea(data.idea);
        setChangesSummary(data.changesSummary || "");
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start idea enhancement");
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

      const data = await callIdeaEnhancer(newConversation);

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
      } else if (data.phase === "complete" && data.idea) {
        setEnhancedIdea(data.idea);
        setChangesSummary(data.changesSummary || "");
        setConversation([
          ...newConversation,
          {
            role: "assistant",
            content: "I've enhanced your idea based on our conversation.",
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

      const data = await callIdeaEnhancer(newConversation, "generate");

      if (data.phase === "complete" && data.idea) {
        setEnhancedIdea(data.idea);
        setChangesSummary(data.changesSummary || "");
        setPhase("complete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enhance idea");
    } finally {
      setIsLoading(false);
    }
  };

  const convertIdeaToMarkdown = (idea: IdeaData): string => {
    let md = `# ${idea.title}\n\n`;
    md += `## Summary\n${idea.summary}\n\n`;
    md += `## Problem Statement\n${idea.problemStatement}\n\n`;

    if (idea.targetAudience && idea.targetAudience.length > 0) {
      md += `## Target Audience\n`;
      for (const audience of idea.targetAudience) {
        md += `### ${audience.segment}\n`;
        md += `${audience.description}\n\n`;
        if (audience.needs && audience.needs.length > 0) {
          md += `**Key Needs:**\n`;
          for (const need of audience.needs) {
            md += `- ${need}\n`;
          }
          md += "\n";
        }
      }
    }

    md += `## Value Proposition\n${idea.valueProposition}\n\n`;

    if (idea.keyFeatures && idea.keyFeatures.length > 0) {
      md += `## Key Features\n`;
      for (const feature of idea.keyFeatures) {
        md += `- **${feature.feature}**: ${feature.benefit}\n`;
      }
      md += "\n";
    }

    if (idea.differentiators && idea.differentiators.length > 0) {
      md += `## Differentiators\n`;
      for (const d of idea.differentiators) {
        md += `- ${d}\n`;
      }
      md += "\n";
    }

    if (idea.successMetrics && idea.successMetrics.length > 0) {
      md += `## Success Metrics\n`;
      for (const m of idea.successMetrics) {
        md += `- ${m}\n`;
      }
      md += "\n";
    }

    if (idea.risks && idea.risks.length > 0) {
      md += `## Risks\n`;
      for (const r of idea.risks) {
        md += `- ${r}\n`;
      }
      md += "\n";
    }

    if (idea.nextSteps && idea.nextSteps.length > 0) {
      md += `## Next Steps\n`;
      for (const step of idea.nextSteps) {
        md += `- ${step}\n`;
      }
    }

    return md;
  };

  const handleSaveEnhancedIdea = async () => {
    if (!enhancedIdea || !currentWorkspaceId || !currentProjectId) {
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

      // Then update the artifact with the enhanced idea
      const markdown = convertIdeaToMarkdown(enhancedIdea);

      await updateArtifact.mutateAsync({
        id: artifact.id,
        title: enhancedIdea.title,
        contentMarkdown: markdown,
        contentJson: enhancedIdea,
      });

      toast.success("Idea enhanced successfully");
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(`/artifacts/${artifact.id}`);
      }
    } catch (error) {
      toast.error("Failed to save enhanced idea");
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
    setEnhancedIdea(null);
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
          <Lightbulb className="w-4 h-4" />
          <span>Enhanced Idea</span>
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
              Describe how you want to refine or improve this idea toward your goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show attached files info */}
            {attachedFiles && attachedFiles.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {attachedFiles.length} attached file{attachedFiles.length > 1 ? 's' : ''} will be included
                  </span>
                </div>
                <div className="space-y-1">
                  {attachedFiles.map((file) => {
                    const isExtractable = isTextExtractable(file.content_json.file_type, file.content_json.file_name);
                    return (
                      <div key={file.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">{file.content_json.file_name}</span>
                        {isExtractable ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Text included
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Metadata only
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isLoadingFiles && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Extracting file contents...</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                What would you like to enhance or refine?
              </label>
              <Textarea
                value={enhancementDetails}
                onChange={(e) => setEnhancementDetails(e.target.value)}
                placeholder="e.g., Focus more on the B2B market, add details about monetization strategy, clarify the competitive advantage..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmitEnhancement}
                disabled={isLoading || isLoadingFiles || !enhancementDetails.trim()}
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
                Answer these questions to help refine your idea
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
                        <Badge variant="outline" className="text-xs">
                          {msg.role === "user" ? "You" : "AI Assistant"}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Please answer these questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {idx + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.question}</p>
                      <Badge variant="outline" className="mt-1 text-xs capitalize">
                        {q.category}
                      </Badge>
                    </div>
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-8">
                      {q.options.map((opt, optIdx) => (
                        <Button
                          key={optIdx}
                          variant={answers[q.id] === opt ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAnswerChange(q.id, opt)}
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer..."
                    className="ml-8 min-h-[80px]"
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
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Now
                </Button>
                {onCancel && (
                  <Button variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Phase */}
      {phase === "complete" && enhancedIdea && (
        <div className="space-y-6">
          {/* Changes Summary */}
          {changesSummary && (
            <Card className="border-accent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  Enhancement Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{changesSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Idea Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" />
                Enhanced Idea: {enhancedIdea.title}
              </CardTitle>
              <CardDescription>
                Review the enhanced idea before accepting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="prose prose-sm max-w-none space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Summary</h3>
                    <p className="text-muted-foreground">{enhancedIdea.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold">Problem Statement</h3>
                    <p className="text-muted-foreground">{enhancedIdea.problemStatement}</p>
                  </div>

                  {enhancedIdea.targetAudience?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Target Audience</h3>
                      {enhancedIdea.targetAudience.map((a, i) => (
                        <div key={i} className="mb-2">
                          <strong>{a.segment}</strong>: {a.description}
                          {a.needs?.length > 0 && (
                            <ul className="list-disc ml-4">
                              {a.needs.map((n, j) => (
                                <li key={j}>{n}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-semibold">Value Proposition</h3>
                    <p className="text-muted-foreground">{enhancedIdea.valueProposition}</p>
                  </div>

                  {enhancedIdea.keyFeatures?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Key Features</h3>
                      <ul className="list-disc ml-4">
                        {enhancedIdea.keyFeatures.map((f, i) => (
                          <li key={i}>
                            <strong>{f.feature}</strong>: {f.benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enhancedIdea.differentiators?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Differentiators</h3>
                      <ul className="list-disc ml-4">
                        {enhancedIdea.differentiators.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enhancedIdea.successMetrics?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Success Metrics</h3>
                      <ul className="list-disc ml-4">
                        {enhancedIdea.successMetrics.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enhancedIdea.risks?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Risks</h3>
                      <ul className="list-disc ml-4">
                        {enhancedIdea.risks.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enhancedIdea.nextSteps?.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold">Next Steps</h3>
                      <ul className="list-disc ml-4">
                        {enhancedIdea.nextSteps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveEnhancedIdea}
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Accept Enhanced Idea
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
