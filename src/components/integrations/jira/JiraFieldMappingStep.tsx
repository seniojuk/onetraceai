import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Loader2, 
  ChevronLeft,
  ArrowRightLeft,
  Settings2,
  CheckCircle2,
  Info,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JiraProject } from "@/hooks/useJiraConnection";
import { useAuth } from "@/hooks/useAuth";

interface JiraFieldMappingStepProps {
  workspaceId: string;
  projectId: string;
  connectionId: string;
  jiraProject: JiraProject;
  onComplete: () => void;
  onBack: () => void;
}

// OneTrace statuses
const ONETRACE_STATUSES = ["DRAFT", "ACTIVE", "IN_PROGRESS", "BLOCKED", "DONE"];

// Common Jira statuses (will be replaced with actual project statuses in future)
const DEFAULT_JIRA_STATUSES = ["To Do", "In Progress", "Blocked", "Done"];

// Default status mapping
const DEFAULT_STATUS_MAPPING: Record<string, string> = {
  "To Do": "ACTIVE",
  "In Progress": "IN_PROGRESS",
  "Blocked": "BLOCKED",
  "Done": "DONE",
};

// Sync settings config with tooltips
const SYNC_SETTINGS_CONFIG = [
  { 
    key: "push_summary", 
    label: "Sync artifact title to issue summary", 
    default: true,
    tooltip: "When enabled, the artifact's title in OneTrace will be synced to the Jira issue's summary field. Changes made to the title will update the corresponding Jira issue."
  },
  { 
    key: "push_description", 
    label: "Sync artifact content to issue description", 
    default: true,
    tooltip: "When enabled, the artifact's content/description will be synced to the Jira issue's description field. This includes formatted text and any markdown content."
  },
  { 
    key: "push_coverage", 
    label: "Include coverage metrics in issue", 
    default: true,
    tooltip: "When enabled, test coverage statistics and traceability metrics from OneTrace will be appended to the Jira issue description, helping stakeholders track quality metrics directly in Jira."
  },
  { 
    key: "sync_status", 
    label: "Bi-directional status sync", 
    default: true,
    tooltip: "When enabled, status changes in either OneTrace or Jira will be reflected in the other system based on your status mapping configuration. This keeps both systems in sync automatically."
  },
  { 
    key: "sync_assignee", 
    label: "Sync assignee (coming soon)", 
    default: false, 
    disabled: true,
    tooltip: "This feature will allow syncing of assignee information between OneTrace and Jira. Currently under development."
  },
  { 
    key: "sync_comments", 
    label: "Sync comments (coming soon)", 
    default: false, 
    disabled: true,
    tooltip: "This feature will enable bi-directional comment syncing between OneTrace artifacts and Jira issues. Currently under development."
  },
  { 
    key: "auto_push_on_publish", 
    label: "Auto-push on artifact publish", 
    default: false,
    tooltip: "When enabled, any changes to linked artifacts will be automatically pushed to Jira whenever the artifact is published. Disable this if you prefer to manually control when updates are synced to Jira."
  },
];

// Tooltip descriptions for main sections
const SECTION_TOOLTIPS = {
  traceabilityMode: "Traceability mode determines how OneTrace stores its metadata (like artifact IDs and sync timestamps) on Jira issues. This affects visibility and admin requirements.",
  customFields: "Custom fields appear as visible fields on Jira issues. They require a Jira administrator to create the fields first, but provide better visibility for team members viewing issues in Jira.",
  issueProperties: "Issue properties are stored as hidden metadata on Jira issues. They don't require any Jira admin setup, but the traceability data won't be visible in the Jira UI.",
  statusMapping: "Status mapping defines how statuses translate between OneTrace and Jira. When an artifact's status changes in one system, it will be mapped to the corresponding status in the other system.",
};

export function JiraFieldMappingStep({
  workspaceId,
  projectId,
  connectionId,
  jiraProject,
  onComplete,
  onBack,
}: JiraFieldMappingStepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [fieldMode, setFieldMode] = useState<"custom_fields" | "issue_properties">("custom_fields");
  const [statusMapping, setStatusMapping] = useState<Record<string, string>>(DEFAULT_STATUS_MAPPING);
  const [syncSettings, setSyncSettings] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    SYNC_SETTINGS_CONFIG.forEach((config) => {
      defaults[config.key] = config.default;
    });
    return defaults;
  });

  // Create project link mutation
  const createProjectLink = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("jira_project_links")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          connection_id: connectionId,
          jira_project_id: jiraProject.id,
          jira_project_key: jiraProject.key,
          jira_project_name: jiraProject.name,
          field_mode: fieldMode,
          status_mapping: statusMapping,
          sync_settings: syncSettings,
          field_map: {}, // Will be populated during field discovery
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-project-link", projectId] });
      toast({
        title: "Jira Integration Complete",
        description: `Successfully linked to ${jiraProject.name} (${jiraProject.key})`,
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "Failed to create project link",
        variant: "destructive",
      });
    },
  });

  const handleStatusMappingChange = (jiraStatus: string, onetraceStatus: string) => {
    setStatusMapping((prev) => ({
      ...prev,
      [jiraStatus]: onetraceStatus,
    }));
  };

  const handleSyncSettingChange = (key: string, value: boolean) => {
    setSyncSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleComplete = () => {
    createProjectLink.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Configure Field Mapping</h3>
        <p className="text-sm text-muted-foreground">
          Set up how OneTrace artifacts map to Jira issues in <strong>{jiraProject.name}</strong>.
        </p>
      </div>

      <TooltipProvider delayDuration={200}>
        {/* Field Mode Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Traceability Mode
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{SECTION_TOOLTIPS.traceabilityMode}</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={fieldMode} onValueChange={(v) => setFieldMode(v as typeof fieldMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom_fields">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col">
                      <span>Custom Fields (Recommended)</span>
                      <span className="text-xs text-muted-foreground">
                        Uses visible Jira custom fields for traceability data
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="issue_properties">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col">
                      <span>Issue Properties</span>
                      <span className="text-xs text-muted-foreground">
                        Uses hidden issue properties (no admin setup required)
                      </span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {fieldMode === "custom_fields"
                  ? SECTION_TOOLTIPS.customFields
                  : SECTION_TOOLTIPS.issueProperties}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Status Mapping */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Status Mapping
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{SECTION_TOOLTIPS.statusMapping}</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DEFAULT_JIRA_STATUSES.map((jiraStatus) => (
                <div key={jiraStatus} className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-normal text-muted-foreground">
                      Jira: <span className="font-medium text-foreground">{jiraStatus}</span>
                    </Label>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <Select
                      value={statusMapping[jiraStatus] || ""}
                      onValueChange={(v) => handleStatusMappingChange(jiraStatus, v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ONETRACE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Sync Settings
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Configure which data fields are synchronized between OneTrace and Jira. Enable only the settings that match your workflow needs.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {SYNC_SETTINGS_CONFIG.map((config) => (
                <div key={config.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Label
                      htmlFor={config.key}
                      className={`text-sm ${config.disabled ? "text-muted-foreground" : ""}`}
                    >
                      {config.label}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{config.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id={config.key}
                    checked={syncSettings[config.key]}
                    onCheckedChange={(v) => handleSyncSettingChange(config.key, v)}
                    disabled={config.disabled}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleComplete} disabled={createProjectLink.isPending}>
          {createProjectLink.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </div>
    </div>
  );
}
