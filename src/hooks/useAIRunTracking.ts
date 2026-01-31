import { useCreateAIRun, useCompleteAIRun, useFailAIRun } from "./useAIRuns";
import type { Json } from "@/integrations/supabase/types";

export type GenerationType = "PRD" | "EPIC" | "STORY" | "TEST_CASE" | "ACCEPTANCE_CRITERIA";

interface TrackAIRunOptions {
  workspaceId: string;
  projectId?: string;
  generationType: GenerationType;
  sourceArtifactId?: string;
  inputSource?: string;
  customPrompt?: string;
}

interface AIRunResult {
  generatedItems: Json[];
  inputTokens?: number;
  outputTokens?: number;
  totalCost?: number;
}

/**
 * Hook to track AI generation runs in the ai_runs table.
 * Use this in PRD, Epic, Story, and other generators to record run history.
 */
export function useAIRunTracking() {
  const createRun = useCreateAIRun();
  const completeRun = useCompleteAIRun();
  const failRun = useFailAIRun();

  const startRun = async (options: TrackAIRunOptions): Promise<string | null> => {
    try {
      const run = await createRun.mutateAsync({
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        runType: "INVOKED",
        inputContext: {
          generationType: options.generationType,
          inputSource: options.inputSource,
          sourceArtifactId: options.sourceArtifactId,
        },
        metadata: {
          generationType: options.generationType,
          inputSource: options.inputSource,
          sourceArtifactId: options.sourceArtifactId,
          customPrompt: options.customPrompt,
        },
      });
      return run.id;
    } catch (error) {
      console.error("Failed to start AI run tracking:", error);
      return null;
    }
  };

  const completeRunWithResult = async (
    runId: string,
    workspaceId: string,
    result: AIRunResult
  ): Promise<void> => {
    try {
      await completeRun.mutateAsync({
        id: runId,
        workspaceId,
        outputArtifacts: result.generatedItems,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalCost: result.totalCost,
        metadata: {
          generatedCount: result.generatedItems.length,
        },
      });
    } catch (error) {
      console.error("Failed to complete AI run tracking:", error);
    }
  };

  const failRunWithError = async (
    runId: string,
    workspaceId: string,
    errorMessage: string
  ): Promise<void> => {
    try {
      await failRun.mutateAsync({
        id: runId,
        workspaceId,
        errorMessage,
      });
    } catch (error) {
      console.error("Failed to record AI run failure:", error);
    }
  };

  return {
    startRun,
    completeRunWithResult,
    failRunWithError,
    isStarting: createRun.isPending,
  };
}
