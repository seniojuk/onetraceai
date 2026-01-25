import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Sync settings configuration
const SYNC_SETTINGS_CONFIG = [
  { key: "push_summary", label: "Sync artifact title to issue summary", description: "Push artifact titles to Jira issue summaries" },
  { key: "push_description", label: "Sync artifact content to issue description", description: "Push artifact content to Jira issue descriptions" },
  { key: "push_coverage", label: "Include coverage metrics in issue", description: "Add coverage statistics to Jira issues" },
  { key: "sync_status", label: "Bi-directional status sync", description: "Sync status changes between OneTrace and Jira" },
  { key: "sync_assignee", label: "Sync assignee", description: "Sync issue assignees (coming soon)", disabled: true },
  { key: "sync_comments", label: "Sync comments", description: "Sync comments between systems (coming soon)", disabled: true },
  { key: "auto_push_on_publish", label: "Auto-push on artifact publish", description: "Automatically push to Jira when artifacts are published" },
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure what data syncs between OneTrace and Jira.
      </p>

      <div className="space-y-4">
        {SYNC_SETTINGS_CONFIG.map((config) => (
          <div key={config.key} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label
                htmlFor={config.key}
                className={`text-sm font-medium ${config.disabled ? "text-muted-foreground" : ""}`}
              >
                {config.label}
              </Label>
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
  );
}
