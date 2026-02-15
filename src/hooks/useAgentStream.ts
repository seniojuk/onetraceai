import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  tokens: string[];
  agentInfo: {
    agentId: string;
    agentName: string;
    agentType: string;
    model: string;
  } | null;
  result: {
    content: string;
    parsedOutput: unknown;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
    metadata: {
      durationMs: number;
      temperature: number;
      requiresApproval: boolean;
    };
  } | null;
  error: string | null;
}

export interface StreamAgentParams {
  agentId: string;
  modelId?: string;
  inputContent: string;
  inputArtifactId?: string;
  workspaceId: string;
  projectId?: string;
  outputFormat?: "markdown" | "json" | "text";
}

export function useAgentStream() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
    tokens: [],
    agentInfo: null,
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (params: StreamAgentParams) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      isStreaming: true,
      content: "",
      tokens: [],
      agentInfo: null,
      result: null,
      error: null,
    });

    try {
      // Get the user's session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            ...params,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start agent stream");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/^event: (\w+)/);
          const dataMatch = chunk.match(/data: (.+)/s);

          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          const data = dataMatch[1];

          try {
            const parsed = JSON.parse(data);

            switch (eventType) {
              case "start":
                setState((prev) => ({
                  ...prev,
                  agentInfo: {
                    agentId: parsed.agentId,
                    agentName: parsed.agentName,
                    agentType: parsed.agentType,
                    model: parsed.model,
                  },
                }));
                break;

              case "token":
                setState((prev) => ({
                  ...prev,
                  content: prev.content + parsed.token,
                  tokens: [...prev.tokens, parsed.token],
                }));
                break;

              case "complete":
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  result: {
                    content: parsed.content,
                    parsedOutput: parsed.parsedOutput,
                    usage: parsed.usage,
                    metadata: parsed.metadata,
                  },
                }));
                // Invalidate ai-runs queries so history updates
                queryClient.invalidateQueries({ queryKey: ["ai-runs"] });
                break;

              case "error":
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: parsed.error,
                }));
                break;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: "Stream aborted",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setState({
      isStreaming: false,
      content: "",
      tokens: [],
      agentInfo: null,
      result: null,
      error: null,
    });
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    reset,
  };
}
