import { ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JiraIssueMapping } from "@/hooks/useJiraIssueMapping";
import { cn } from "@/lib/utils";

// Jira-style blue color
const JIRA_BLUE = "hsl(214, 89%, 52%)";

interface JiraIssueBadgeProps {
  mapping: JiraIssueMapping;
  className?: string;
}

/**
 * Inline badge showing the linked Jira issue key with a link
 */
export function JiraIssueBadge({ mapping, className }: JiraIssueBadgeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapping.jira_issue_url) {
      window.open(mapping.jira_issue_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer hover:bg-[hsl(214,89%,52%)]/10 transition-colors border-[hsl(214,89%,52%)]/40",
              mapping.has_conflict && "border-destructive/40",
              className
            )}
            onClick={handleClick}
          >
            <svg
              className="w-3 h-3 mr-1"
              viewBox="0 0 24 24"
              fill={JIRA_BLUE}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.004 0c-3.314 0-6 2.686-6 6 0 2.398 1.416 4.47 3.452 5.435l.048.033c.025.017.051.034.078.05l.072.041.095.048.025.012a5.97 5.97 0 001.23.416v5.965l3-3 3 3V12.035a5.97 5.97 0 001.23-.416l.025-.012.095-.048.072-.041c.027-.016.053-.033.078-.05l.048-.033c2.036-.965 3.452-3.037 3.452-5.435 0-3.314-2.686-6-6-6z" />
            </svg>
            <span className="font-mono text-xs" style={{ color: JIRA_BLUE }}>
              {mapping.jira_issue_key}
            </span>
            {mapping.has_conflict && (
              <AlertCircle className="w-3 h-3 ml-1 text-destructive" />
            )}
            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open in Jira</p>
          {mapping.has_conflict && (
            <p className="text-destructive text-xs">Has sync conflict</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface JiraIssueSidebarCardProps {
  mapping: JiraIssueMapping;
  artifactShortId: string;
}

/**
 * Sidebar card showing Jira integration details for an artifact
 */
export function JiraIssueSidebarCard({ mapping, artifactShortId }: JiraIssueSidebarCardProps) {
  const handleOpenInJira = () => {
    if (mapping.jira_issue_url) {
      window.open(mapping.jira_issue_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={JIRA_BLUE}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.004 0c-3.314 0-6 2.686-6 6 0 2.398 1.416 4.47 3.452 5.435l.048.033c.025.017.051.034.078.05l.072.041.095.048.025.012a5.97 5.97 0 001.23.416v5.965l3-3 3 3V12.035a5.97 5.97 0 001.23-.416l.025-.012.095-.048.072-.041c.027-.016.053-.033.078-.05l.048-.033c2.036-.965 3.452-3.037 3.452-5.435 0-3.314-2.686-6-6-6z" />
          </svg>
          Jira Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Jira Issue Key */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            Jira Issue
          </label>
          <div className="flex items-center gap-2">
            <code
              className="px-2 py-1 rounded bg-muted font-mono text-sm cursor-pointer hover:bg-muted/80 transition-colors"
              style={{ color: JIRA_BLUE }}
              onClick={handleOpenInJira}
            >
              {mapping.jira_issue_key}
            </code>
            {mapping.has_conflict && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Conflict
              </Badge>
            )}
          </div>
        </div>

        {/* OneTrace ID (for reference when looking at Jira) */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            OneTrace ID
          </label>
          <code className="px-2 py-1 rounded bg-muted font-mono text-sm text-foreground">
            {artifactShortId}
          </code>
        </div>

        <Separator />

        {/* Sync Status */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-medium text-muted-foreground block mb-1">
              Last Pushed
            </label>
            <span className="text-foreground">
              {mapping.last_pushed_at
                ? new Date(mapping.last_pushed_at).toLocaleDateString()
                : "Never"}
            </span>
          </div>
          <div>
            <label className="font-medium text-muted-foreground block mb-1">
              Last Pulled
            </label>
            <span className="text-foreground">
              {mapping.last_pulled_at
                ? new Date(mapping.last_pulled_at).toLocaleDateString()
                : "Never"}
            </span>
          </div>
        </div>

        {/* Open in Jira button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleOpenInJira}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in Jira
        </Button>
      </CardContent>
    </Card>
  );
}
