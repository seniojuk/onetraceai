import { Brain, Check, Sparkles, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAllModels, type LLMModel } from "@/hooks/useLLMModels";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCapabilities?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  placeholder = "Select a model...",
  disabled,
  showCapabilities = false,
}: ModelSelectorProps) {
  const { data: models, isLoading } = useAllModels();

  // Group models by provider
  const modelsByProvider = models?.reduce((acc, model) => {
    const providerName = model.provider?.display_name || "Other";
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  const selectedModel = models?.find(m => m.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedModel && (
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>{selectedModel.display_name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            Loading models...
          </div>
        ) : (
          Object.entries(modelsByProvider || {}).map(([provider, providerModels]) => (
            <SelectGroup key={provider}>
              <SelectLabel className="flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {provider}
              </SelectLabel>
              {providerModels?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <ModelOption model={model} showCapabilities={showCapabilities} />
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function ModelOption({ 
  model, 
  showCapabilities 
}: { 
  model: LLMModel & { provider: { id: string; display_name: string; provider_name: string; is_global: boolean } };
  showCapabilities: boolean;
}) {
  const capabilities = model.capabilities || {};
  
  return (
    <div className="flex items-center gap-2 w-full">
      <Brain className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{model.display_name}</div>
        {showCapabilities && (
          <div className="flex items-center gap-1 mt-1">
            {capabilities.streaming && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                <Zap className="w-2 h-2 mr-0.5" />
                Stream
              </Badge>
            )}
            {capabilities.tool_calling && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Tools
              </Badge>
            )}
            {capabilities.multimodal && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Vision
              </Badge>
            )}
            {capabilities.advanced_reasoning && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Reasoning
              </Badge>
            )}
          </div>
        )}
      </div>
      {model.cost_per_1k_input_tokens !== null && (
        <span className="text-xs text-muted-foreground">
          ${model.cost_per_1k_input_tokens}/1k
        </span>
      )}
    </div>
  );
}
