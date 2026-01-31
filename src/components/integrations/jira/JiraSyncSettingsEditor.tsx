import { useState, useEffect } from "react";
import { Loader2, Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sync settings configuration with tooltips
const SYNC_SETTINGS_CONFIG = [
  { 
    key: "push_summary", 
    label: "Sync artifact title to issue summary", 
    description: "Push artifact titles to Jira issue summaries",
    tooltip: "When enabled, the artifact's title in OneTrace will be synced to the Jira issue's summary field. Changes made to the title will update the corresponding Jira issue."
  },
  { 
    key: "push_description", 
    label: "Sync artifact content to issue description", 
    description: "Push artifact content to Jira issue descriptions",
    tooltip: "When enabled, the artifact's content/description will be synced to the Jira issue's description field. This includes formatted text and any markdown content."
  },
  { 
    key: "push_coverage", 
    label: "Include coverage metrics in issue", 
    description: "Add coverage statistics to Jira issues",
    tooltip: "When enabled, test coverage statistics and traceability metrics from OneTrace will be appended to the Jira issue description, helping stakeholders track quality metrics directly in Jira."
  },
  { 
    key: "sync_status", 
    label: "Bi-directional status sync", 
    description: "Sync status changes between OneTrace and Jira",
    tooltip: "When enabled, status changes in either OneTrace or Jira will be reflected in the other system based on your status mapping configuration. This keeps both systems in sync automatically."
  },
  { 
    key: "sync_assignee", 
    label: "Sync assignee", 
    description: "Sync issue assignees (coming soon)", 
    disabled: true,
    tooltip: "This feature will allow syncing of assignee information between OneTrace and Jira. Currently under development."
  },
  { 
    key: "sync_comments", 
    label: "Sync comments", 
    description: "Sync comments between systems (coming soon)", 
    disabled: true,
    tooltip: "This feature will enable bi-directional comment syncing between OneTrace artifacts and Jira issues. Currently under development."
  },
  { 
    key: "auto_push_on_publish", 
    label: "Auto-push on artifact publish", 
    description: "Automatically push to Jira when artifacts are published",
    tooltip: "When enabled, any changes to linked artifacts will be automatically pushed to Jira whenever the artifact is published. Disable this if you prefer to manually control when updates are synced to Jira."
  },
];

interface JiraSyncSettingsEditorProps {
  syncSettings: Record<string, boolean>;
  onChange: (settings: Record<string, boolean>) => Promise<void>;
  isLoading?: boolean;
}

export function JiraSyncSettingsEditor({
  syncSettings,
  onChange,
  isLoading,
}: JiraSyncSettingsEditorProps) {
  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>(syncSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(syncSettings);
    setHasChanges(false);
  }, [syncSettings]);

  const handleSettingChange = (key: string, value: boolean) => {
    const newSettings = {
      ...localSettings,
      [key]: value,
    };
    setLocalSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(syncSettings));
  };

  const handleSave = async () => {
    await onChange(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(syncSettings);
    setHasChanges(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure what data syncs between OneTrace and Jira.
        </p>

        <div className="space-y-4">
          {SYNC_SETTINGS_CONFIG.map((config) => (
            <div key={config.key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={config.key}
                    className={`text-sm font-medium ${config.disabled ? "text-muted-foreground" : ""}`}
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </div>
              <Switch
                id={config.key}
                checked={localSettings[config.key] ?? false}
                onCheckedChange={(v) => handleSettingChange(config.key, v)}
                disabled={config.disabled || isLoading}
              />
            </div>
          ))}
        </div>

        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isLoading}>
              Reset
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
