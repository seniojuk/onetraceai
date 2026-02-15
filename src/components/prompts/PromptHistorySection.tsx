import { useState } from "react";
import { History, Copy, Eye, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGeneratedPrompts } from "@/hooks/usePromptGenerator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PromptHistorySectionProps {
  artifactId: string;
}

export const PromptHistorySection = ({ artifactId }: PromptHistorySectionProps) => {
  const { data: savedPrompts } = useGeneratedPrompts(artifactId);
  const [viewingPrompt, setViewingPrompt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  if (!savedPrompts || savedPrompts.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Prompt History
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {savedPrompts.length}
            </Badge>
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {savedPrompts.map((sp) => (
          <div key={sp.id} className="p-3 rounded-md border bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {(sp.metadata as any)?.toolName || "unknown"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  v{sp.version}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(sp.created_at).toLocaleDateString()}
              </span>
            </div>

            {viewingPrompt === sp.id ? (
              <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed p-2 rounded border bg-muted/30 max-h-[300px] overflow-auto">
                {sp.prompt_content}
              </pre>
            ) : (
              <pre className="text-[11px] font-mono text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                {sp.prompt_content}
              </pre>
            )}

            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2"
                onClick={() => handleCopy(sp.prompt_content)}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2"
                onClick={() => setViewingPrompt(viewingPrompt === sp.id ? null : sp.id)}
              >
                <Eye className="w-3 h-3 mr-1" />
                {viewingPrompt === sp.id ? "Collapse" : "View"}
              </Button>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
