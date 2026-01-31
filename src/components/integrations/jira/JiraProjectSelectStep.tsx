import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Search, 
  ChevronLeft,
  FolderKanban,
  AlertCircle,
  Check,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JiraConnection, JiraProject, useJiraProjects } from "@/hooks/useJiraConnection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JiraProjectSelectStepProps {
  workspaceId: string;
  projectId: string;
  connection: JiraConnection;
  onProjectSelected: (project: JiraProject) => void;
  onBack: () => void;
}

type ProjectType = "software" | "service_desk" | "business";

export function JiraProjectSelectStep({
  workspaceId,
  projectId,
  connection,
  onProjectSelected,
  onBack,
}: JiraProjectSelectStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [activeTab, setActiveTab] = useState<"existing" | "create">("existing");
  
  // Create project form state
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectKey, setNewProjectKey] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("software");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const { toast } = useToast();

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

  // Auto-generate project key from name
  const handleProjectNameChange = (name: string) => {
    setNewProjectName(name);
    // Generate key from first letters of words, uppercase, max 10 chars
    const words = name.trim().split(/\s+/).filter(Boolean);
    let key = "";
    if (words.length === 1) {
      key = words[0].substring(0, 4).toUpperCase();
    } else {
      key = words.map(w => w[0]).join("").substring(0, 10).toUpperCase();
    }
    // Ensure it starts with a letter and only contains valid chars
    key = key.replace(/[^A-Z0-9]/g, "");
    if (key && !/^[A-Z]/.test(key)) {
      key = "P" + key;
    }
    setNewProjectKey(key);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectKey.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a project name and key.",
        variant: "destructive",
      });
      return;
    }

    // Validate project key format
    const keyRegex = /^[A-Z][A-Z0-9]{1,9}$/;
    if (!keyRegex.test(newProjectKey)) {
      toast({
        title: "Invalid Project Key",
        description: "Project key must be 2-10 uppercase letters/numbers, starting with a letter.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jira-create-project`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            connectionId: connection.id,
            workspaceId,
            projectName: newProjectName.trim(),
            projectKey: newProjectKey.trim(),
            projectType: newProjectType,
            description: newProjectDescription.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      toast({
        title: "Project Created",
        description: `Successfully created Jira project "${data.project.name}"`,
      });

      // Refresh the project list and select the new project
      await refetch();
      
      const newProject: JiraProject = {
        id: data.project.id,
        key: data.project.key,
        name: data.project.name,
        type: data.project.type,
        avatar: undefined,
      };
      
      setSelectedProject(newProject);
      setActiveTab("existing");
      
      // Clear the form
      setNewProjectName("");
      setNewProjectKey("");
      setNewProjectDescription("");
      setNewProjectType("software");
      
    } catch (err) {
      console.error("Failed to create Jira project:", err);
      toast({
        title: "Failed to Create Project",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
          Choose an existing Jira project or create a new one to link with this OneTrace project.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "create")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Existing Projects</TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="w-4 h-4 mr-1" />
            Create New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="mt-4 space-y-4">
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
          <ScrollArea className="h-[280px] rounded-md border bg-background">
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
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setActiveTab("create")}
                >
                  Create a new project
                </Button>
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
        </TabsContent>

        <TabsContent value="create" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Mobile App Development"
                value={newProjectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectKey">Project Key *</Label>
              <Input
                id="projectKey"
                placeholder="e.g., MAD"
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                2-10 uppercase letters/numbers, starting with a letter. Used as prefix for issue keys.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type *</Label>
              <Select value={newProjectType} onValueChange={(v) => setNewProjectType(v as ProjectType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software (Scrum)</SelectItem>
                  <SelectItem value="service_desk">Service Desk</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description (optional)</Label>
              <Input
                id="projectDescription"
                placeholder="Brief description of the project"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreateProject} 
              disabled={isCreating || !newProjectName.trim() || !newProjectKey.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Jira Project
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
