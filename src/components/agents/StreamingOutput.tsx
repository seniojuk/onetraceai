import { useEffect, useRef } from "react";
import { 
  Bot, 
  Brain, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Zap,
  Clock,
  Coins,
  Copy,
  Check,
  Download,
  FileText,
  FileJson,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { StreamingState } from "@/hooks/useAgentStream";
import { downloadAsText, downloadAsPdf } from "@/utils/outputExport";

interface StreamingOutputProps {
  state: StreamingState;
  className?: string;
}

export function StreamingOutput({ state, className }: StreamingOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (state.isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.content, state.isStreaming]);

  const handleCopy = async () => {
    const content = state.result?.content || state.content;
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const contentForExport = state.result?.content || state.content;
  const agentName = state.agentInfo?.agentName || "Agent Output";

  // Detect if content looks like JSON
  const isJsonContent = (() => {
    try {
      const trimmed = contentForExport.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        JSON.parse(trimmed);
        return true;
      }
    } catch {}
    return false;
  })();

  // Calculate estimated progress based on tokens (rough estimate)
  const estimatedProgress = state.isStreaming 
    ? Math.min(95, (state.tokens.length / 100) * 100) 
    : state.result ? 100 : 0;

  if (!state.isStreaming && !state.content && !state.error) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with agent info and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state.agentInfo && (
            <>
              <div className="p-2 rounded-lg bg-accent/10">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="font-medium text-sm">{state.agentInfo.agentName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {state.agentInfo.model}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.isStreaming && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Generating
            </Badge>
          )}
          {state.result && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          )}
          {state.error && (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar during streaming */}
      {state.isStreaming && (
        <div className="space-y-1">
          <Progress value={estimatedProgress} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{state.tokens.length} tokens</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Streaming...
            </span>
          </div>
        </div>
      )}

      {/* Content area */}
      <ScrollArea 
        className="h-[300px] rounded-lg border bg-muted/30"
        ref={scrollRef as React.RefObject<HTMLDivElement>}
      >
        <div className="p-4">
          {state.error ? (
            <div className="text-destructive text-sm">
              <XCircle className="w-4 h-4 inline mr-2" />
              {state.error}
            </div>
          ) : isJsonContent && !state.isStreaming ? (
            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-transparent p-0 m-0">
              {JSON.stringify(JSON.parse(contentForExport.trim()), null, 2)}
            </pre>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {state.isStreaming ? (
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-transparent p-0 m-0">
                  {state.content}
                  <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
                </pre>
              ) : (
                <ReactMarkdown>{contentForExport}</ReactMarkdown>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Result stats + actions */}
      {state.result && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{state.result.usage.totalTokens} tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{(state.result.metadata.durationMs / 1000).toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              <span>${state.result.usage.estimatedCost.toFixed(6)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadAsText(contentForExport, agentName)}>
              <FileText className="w-4 h-4 mr-1" />
              .txt
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadAsPdf(contentForExport, agentName)}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      )}

      {/* Token details breakdown */}
      {state.result && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30 border">
            <div className="text-lg font-semibold">{state.result.usage.inputTokens}</div>
            <div className="text-xs text-muted-foreground">Input Tokens</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border">
            <div className="text-lg font-semibold">{state.result.usage.outputTokens}</div>
            <div className="text-xs text-muted-foreground">Output Tokens</div>
          </div>
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <div className="text-lg font-semibold text-accent">{state.result.usage.totalTokens}</div>
            <div className="text-xs text-muted-foreground">Total Tokens</div>
          </div>
        </div>
      )}
    </div>
  );
}
