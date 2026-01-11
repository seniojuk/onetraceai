import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import type { AgentConfig, AgentType, RoutingMode, CreateAgentConfigInput } from "@/hooks/useAgentConfigs";
import { useAllModels } from "@/hooks/useLLMModels";
import { toast } from "sonner";

const agentTypes: { value: AgentType; label: string }[] = [
  { value: "PRODUCT_AGENT", label: "Product Agent" },
  { value: "STORY_AGENT", label: "Story Agent" },
  { value: "ARCHITECTURE_AGENT", label: "Architecture Agent" },
  { value: "UX_AGENT", label: "UX Agent" },
  { value: "DEV_AGENT", label: "Dev Agent" },
  { value: "QA_AGENT", label: "QA Agent" },
  { value: "DRIFT_AGENT", label: "Drift Agent" },
  { value: "RELEASE_AGENT", label: "Release Agent" },
  { value: "SECURITY_AGENT", label: "Security Agent" },
  { value: "DOCS_AGENT", label: "Documentation Agent" },
  { value: "INTEGRATION_AGENT", label: "Integration Agent" },
  { value: "CUSTOM_AGENT", label: "Custom Agent" },
];

const routingModes: { value: RoutingMode; label: string; description: string }[] = [
  { value: "AUTO_ROUTE", label: "Auto Route", description: "Automatically select best model" },
  { value: "LOCKED", label: "Locked", description: "Always use default model" },
  { value: "MANUAL_PER_RUN", label: "Manual", description: "Choose model per run" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  agentType: z.string().min(1, "Agent type is required"),
  persona: z.string().optional(),
  systemPrompt: z.string().optional(),
  defaultModelId: z.string().optional(),
  routingMode: z.string().optional(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(128000).optional(),
  autonomousEnabled: z.boolean(),
  guardrailsMaxTokens: z.number().optional(),
  guardrailsRequireApproval: z.boolean(),
  guardrailsRateLimit: z.number().optional(),
  blockedTopics: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AgentConfig | null;
  workspaceId: string;
  projectId?: string;
  onSave: (data: CreateAgentConfigInput) => Promise<void>;
  isLoading?: boolean;
}

export function AgentConfigDialog({
  open,
  onOpenChange,
  agent,
  workspaceId,
  projectId,
  onSave,
  isLoading,
}: AgentConfigDialogProps) {
  const { data: models, isLoading: modelsLoading } = useAllModels();
  const [blockedTopicInput, setBlockedTopicInput] = useState("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      agentType: "CUSTOM_AGENT",
      persona: "",
      systemPrompt: "",
      defaultModelId: "",
      routingMode: "AUTO_ROUTE",
      temperature: 0.7,
      maxTokens: 4096,
      autonomousEnabled: false,
      guardrailsMaxTokens: undefined,
      guardrailsRequireApproval: false,
      guardrailsRateLimit: undefined,
      blockedTopics: [],
    },
  });

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || "",
        agentType: agent.agent_type,
        persona: agent.persona || "",
        systemPrompt: agent.system_prompt || "",
        defaultModelId: agent.default_model_id || "",
        routingMode: agent.routing_mode || "AUTO_ROUTE",
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.max_tokens ?? 4096,
        autonomousEnabled: agent.autonomous_enabled ?? false,
        guardrailsMaxTokens: agent.guardrails?.max_tokens_per_run,
        guardrailsRequireApproval: agent.guardrails?.require_approval ?? false,
        guardrailsRateLimit: agent.guardrails?.rate_limit_per_hour,
        blockedTopics: agent.guardrails?.blocked_topics || [],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        agentType: "CUSTOM_AGENT",
        persona: "",
        systemPrompt: "",
        defaultModelId: "",
        routingMode: "AUTO_ROUTE",
        temperature: 0.7,
        maxTokens: 4096,
        autonomousEnabled: false,
        guardrailsMaxTokens: undefined,
        guardrailsRequireApproval: false,
        guardrailsRateLimit: undefined,
        blockedTopics: [],
      });
    }
  }, [agent, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      const guardrails = {
        max_tokens_per_run: values.guardrailsMaxTokens,
        require_approval: values.guardrailsRequireApproval,
        rate_limit_per_hour: values.guardrailsRateLimit,
        blocked_topics: values.blockedTopics,
      };

      await onSave({
        workspaceId,
        projectId,
        name: values.name,
        description: values.description,
        agentType: values.agentType as AgentType,
        persona: values.persona,
        systemPrompt: values.systemPrompt,
        defaultModelId: values.defaultModelId || undefined,
        routingMode: values.routingMode as RoutingMode,
        temperature: values.temperature,
        maxTokens: values.maxTokens,
        autonomousEnabled: values.autonomousEnabled,
        guardrails,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save agent configuration");
    }
  };

  const addBlockedTopic = () => {
    if (blockedTopicInput.trim()) {
      const current = form.getValues("blockedTopics");
      if (!current.includes(blockedTopicInput.trim())) {
        form.setValue("blockedTopics", [...current, blockedTopicInput.trim()]);
      }
      setBlockedTopicInput("");
    }
  };

  const removeBlockedTopic = (topic: string) => {
    const current = form.getValues("blockedTopics");
    form.setValue("blockedTopics", current.filter(t => t !== topic));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            Configure your AI agent's behavior, model, and guardrails.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="persona">Persona</TabsTrigger>
                <TabsTrigger value="model">Model</TabsTrigger>
                <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Agent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What does this agent do?"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autonomousEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Autonomous Mode</FormLabel>
                        <FormDescription>
                          Allow this agent to run without manual invocation
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="persona" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="persona"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona</FormLabel>
                      <FormDescription>
                        Define the agent's character and expertise
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="You are an experienced product manager with deep expertise in..."
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormDescription>
                        Instructions for how the agent should behave
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Help create comprehensive PRDs that capture product vision..."
                          className="min-h-[150px] font-mono text-sm resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="model" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="defaultModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelsLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Loading models...
                            </div>
                          ) : (
                            models?.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span>{model.display_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({model.provider?.display_name})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {routingModes.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              <div>
                                <div>{mode.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {mode.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value}</FormLabel>
                      <FormDescription>
                        Lower = more focused, Higher = more creative
                      </FormDescription>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          min={0}
                          max={2}
                          step={0.1}
                          className="py-4"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Output Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={128000}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 4096)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="guardrails" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="guardrailsRequireApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Approval</FormLabel>
                        <FormDescription>
                          Outputs must be approved before saving
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardrailsMaxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens Per Run</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="No limit"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardrailsRateLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit (runs per hour)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="No limit"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blockedTopics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blocked Topics</FormLabel>
                      <FormDescription>
                        Topics the agent should refuse to discuss
                      </FormDescription>
                      <div className="flex gap-2">
                        <Input
                          value={blockedTopicInput}
                          onChange={(e) => setBlockedTopicInput(e.target.value)}
                          placeholder="Add topic..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addBlockedTopic();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" onClick={addBlockedTopic}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((topic) => (
                          <Badge key={topic} variant="secondary" className="gap-1">
                            {topic}
                            <button
                              type="button"
                              onClick={() => removeBlockedTopic(topic)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {agent ? "Update Agent" : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
