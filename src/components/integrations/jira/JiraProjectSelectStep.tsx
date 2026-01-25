import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Search, 
  ChevronLeft,
  FolderKanban,
  AlertCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JiraConnection, JiraProject, useJiraProjects } from "@/hooks/useJiraConnection";

interface JiraProjectSelectStepProps {
  workspaceId: string;
  projectId: string;
  connection: JiraConnection;
  onProjectSelected: (project: JiraProject) => void;
  onBack: () => void;
}

export function JiraProjectSelectStep({
  workspaceId,
  projectId,
  connection,
  onProjectSelected,
  onBack,
}: JiraProjectSelectStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);

  const { data: projects, isLoading, error, refetch } = useJiraProjects(
    connection.id,
    workspaceId
  );

  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.key.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleContinue = () => {
    if (selectedProject) {
      onProjectSelected(selectedProject);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Jira projects. Please check your connection and try again.
            <span className="block mt-1 text-xs opacity-80">
              {error instanceof Error ? error.message : "Unknown error"}
            </span>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Select Jira Project</h3>
        <p className="text-sm text-muted-foreground">
          Choose which Jira project to link with this OneTrace project. Issues will be synced between them.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Project list */}
      <ScrollArea className="h-[300px] rounded-md border bg-background">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No projects match your search" : "No projects found in Jira"}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredProjects.map((project) => {
              const isSelected = selectedProject?.id === project.id;

              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  {project.avatar ? (
                    <img
                      src={project.avatar}
                      alt={project.name}
                      className="h-10 w-10 rounded"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {project.name}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {project.key} • {project.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!selectedProject}>
          Continue
        </Button>
      </div>
    </div>
  );
}
