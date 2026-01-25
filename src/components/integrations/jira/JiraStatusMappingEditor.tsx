import { useState, useEffect } from "react";
import { ArrowRightLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// OneTrace statuses
const ONETRACE_STATUSES = ["DRAFT", "ACTIVE", "IN_PROGRESS", "BLOCKED", "DONE"];

// Common Jira statuses (will be replaced with actual project statuses in future)
const DEFAULT_JIRA_STATUSES = ["To Do", "In Progress", "Blocked", "Done"];

interface JiraStatusMappingEditorProps {
  statusMapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => Promise<void>;
  isLoading?: boolean;
}

export function JiraStatusMappingEditor({
  statusMapping,
  onChange,
  isLoading,
}: JiraStatusMappingEditorProps) {
  const [localMapping, setLocalMapping] = useState<Record<string, string>>(statusMapping);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalMapping(statusMapping);
    setHasChanges(false);
  }, [statusMapping]);

  const handleMappingChange = (jiraStatus: string, onetraceStatus: string) => {
    const newMapping = {
      ...localMapping,
      [jiraStatus]: onetraceStatus,
    };
    setLocalMapping(newMapping);
    setHasChanges(JSON.stringify(newMapping) !== JSON.stringify(statusMapping));
  };

  const handleSave = async () => {
    await onChange(localMapping);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalMapping(statusMapping);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map Jira statuses to OneTrace artifact statuses for bi-directional sync.
      </p>

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
                value={localMapping[jiraStatus] || ""}
                onValueChange={(v) => handleMappingChange(jiraStatus, v)}
                disabled={isLoading}
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
