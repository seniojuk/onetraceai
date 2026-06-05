import { useMemo } from "react";
import { useUIStore } from "@/store/uiStore";
import { useArtifacts } from "./useArtifacts";
import { useGitHubConnection } from "./useGitHubConnection";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  estimate: string;
  href: string;
}

/**
 * Computes the 5-step setup checklist surfaced on the dashboard until the
 * user has connected their work end-to-end (or dismissed the panel).
 */
export function useOnboardingChecklist() {
  const { currentProjectId } = useUIStore();
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const { data: githubConnection } = useGitHubConnection(currentProjectId || undefined);

  return useMemo(() => {
    const has = (type: string) =>
      (artifacts || []).some((a) => a.type === type);

    const hasPushedToJira = (artifacts || []).some(
      (a) => a.type === "EPIC" && (a.labels as any)?.jira_issue_key,
    );

    const items: ChecklistItem[] = [
      {
        id: "prd",
        label: "Create your first PRD",
        done: has("PRD"),
        estimate: "2 min",
        href: "/artifacts/new?type=PRD",
      },
      {
        id: "epics",
        label: "Generate Epics from your PRD",
        done: has("EPIC"),
        estimate: "1 min",
        href: "/artifacts/new?type=EPIC",
      },
      {
        id: "stories",
        label: "Generate Stories from your Epics",
        done: has("STORY"),
        estimate: "2 min",
        href: "/artifacts/new?type=STORY",
      },
      {
        id: "github",
        label: "Connect your GitHub repo",
        done: !!githubConnection && githubConnection.status === "connected",
        estimate: "3 min",
        href: "/integrations",
      },
      {
        id: "jira",
        label: "Push your first Epic to Jira",
        done: hasPushedToJira,
        estimate: "2 min",
        href: "/integrations",
      },
    ];

    const completed = items.filter((i) => i.done).length;
    return { items, completed, total: items.length };
  }, [artifacts, githubConnection]);
}
