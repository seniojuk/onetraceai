import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Network, 
  LayoutDashboard, 
  FileText, 
  GitBranch,
  GitMerge,
  BarChart3, 
  AlertTriangle,
  Settings,
  Users,
  CreditCard,
  Plug,
  Sparkles,
  ChevronDown,
  LogOut,
  Plus,
  Menu,
  X,
  Shield,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces, useDeleteWorkspace } from "@/hooks/useWorkspaces";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { SessionRecoveryDialog } from "@/components/auth/SessionRecoveryDialog";
import { DeleteConfirmDialog } from "@/components/layout/DeleteConfirmDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Artifacts", path: "/artifacts" },
  { icon: GitBranch, label: "Graph", path: "/graph" },
  { icon: GitMerge, label: "Lineage", path: "/lineage" },
  { icon: BarChart3, label: "Coverage", path: "/coverage" },
  { icon: AlertTriangle, label: "Drift", path: "/drift" },
  { icon: Sparkles, label: "AI Agents", path: "/ai-agents" },
  { icon: Sparkles, label: "Prompt Gen", path: "/prompt-generator" },
];

const settingsItems = [
  { icon: Plug, label: "Integrations", path: "/integrations" },
  { icon: Users, label: "Team", path: "/team" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionExpired, lastEmail, handleRecovered } = useSessionRecovery();
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    currentWorkspaceId, 
    currentProjectId,
    setCurrentWorkspace,
    setCurrentProject
  } = useUIStore();

  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: projects, isLoading: loadingProjects } = useProjects(currentWorkspaceId || undefined);
  const { data: isPlatformAdmin } = usePlatformAdmin();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const deleteProjectMutation = useDeleteProject();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "workspace" | "project";
    id: string;
    name: string;
  } | null>(null);

  // Set default workspace on load
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspace(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspace]);

  // Set default project on workspace change
  useEffect(() => {
    if (projects && projects.length > 0 && !currentProjectId) {
      setCurrentProject(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProject]);

  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId);
  const currentProject = projects?.find(p => p.id === currentProjectId);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === "workspace") {
        await deleteWorkspaceMutation.mutateAsync({ workspaceId: deleteDialog.id });
        if (currentWorkspaceId === deleteDialog.id) {
          const remaining = workspaces?.filter(w => w.id !== deleteDialog.id);
          setCurrentWorkspace(remaining?.[0]?.id || null);
        }
        toast.success("Workspace deleted successfully");
      } else {
        await deleteProjectMutation.mutateAsync({ projectId: deleteDialog.id, workspaceId: currentWorkspaceId! });
        if (currentProjectId === deleteDialog.id) {
          const remaining = projects?.filter(p => p.id !== deleteDialog.id);
          setCurrentProject(remaining?.[0]?.id || null);
        }
        toast.success("Project deleted successfully");
      }
      setDeleteDialog(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
              <Network className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-sidebar-foreground">OneTrace AI</span>
            )}
          </Link>
        </div>

        {/* Workspace/Project Selector */}
        {!sidebarCollapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {currentWorkspace?.name?.charAt(0) || "W"}
                    </div>
                    <div className="text-left truncate">
                      <p className="text-sm font-medium truncate">{currentWorkspace?.name || "Select Workspace"}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{currentProject?.name || "No project"}</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Workspaces</div>
                {workspaces?.map(ws => (
                  <DropdownMenuItem 
                    key={ws.id} 
                    onClick={() => setCurrentWorkspace(ws.id)}
                    className={cn("group", ws.id === currentWorkspaceId && "bg-accent/10")}
                  >
                    <span className="flex-1 truncate">{ws.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({ open: true, type: "workspace", id: ws.id, name: ws.name });
                      }}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-workspace")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </DropdownMenuItem>
                
                {projects && projects.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Projects</div>
                    {projects.map(proj => (
                      <DropdownMenuItem 
                        key={proj.id} 
                        onClick={() => setCurrentProject(proj.id)}
                        className={cn("group", proj.id === currentProjectId && "bg-accent/10")}
                      >
                        <span className="text-xs text-muted-foreground mr-2">{proj.project_key}</span>
                        <span className="flex-1 truncate">{proj.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ open: true, type: "project", id: proj.id, name: proj.name });
                          }}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-project")}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || 
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <Separator className="my-4 bg-sidebar-border" />
          <nav className="px-3 space-y-1">
            {settingsItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
            
            {/* Platform Admin Link - Only visible to platform admins */}
            {isPlatformAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  location.pathname === "/admin"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">Platform Admin</span>}
              </Link>
            )}
          </nav>
        </ScrollArea>

        {/* User Menu */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn(
                "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent",
                sidebarCollapsed && "justify-center px-2"
              )}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {getInitials(user?.user_metadata?.full_name || user?.email || "U")}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="ml-3 text-left truncate">
                    <p className="text-sm font-medium truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {sidebarCollapsed ? <Menu className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Top Header with Switcher */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Workspace/Project Switcher in Header */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    {currentWorkspace?.name?.charAt(0) || "W"}
                  </div>
                  <span className="hidden sm:inline font-medium">
                    {currentWorkspace?.name || "Select Workspace"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Workspaces
                </div>
                {loadingWorkspaces ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">Loading...</div>
                ) : (
                  workspaces?.map(ws => (
                    <DropdownMenuItem 
                      key={ws.id} 
                      onClick={() => setCurrentWorkspace(ws.id)}
                      className={cn(
                        "cursor-pointer group",
                        ws.id === currentWorkspaceId && "bg-accent/10 text-accent"
                      )}
                    >
                      <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center text-xs font-bold text-accent mr-2">
                        {ws.name?.charAt(0) || "W"}
                      </div>
                      <span className="flex-1 truncate">{ws.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "workspace", id: ws.id, name: ws.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-workspace")} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-muted-foreground">/</span>

            {/* Project Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="text-xs text-muted-foreground">{currentProject?.project_key || ""}</span>
                  <span className="font-medium">{currentProject?.name || "Select Project"}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects in {currentWorkspace?.name || "Workspace"}
                </div>
                {loadingProjects ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">Loading...</div>
                ) : projects && projects.length > 0 ? (
                  projects.map(proj => (
                    <DropdownMenuItem 
                      key={proj.id} 
                      onClick={() => setCurrentProject(proj.id)}
                      className={cn(
                        "cursor-pointer group",
                        proj.id === currentProjectId && "bg-accent/10 text-accent"
                      )}
                    >
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{proj.project_key}</span>
                      <span className="flex-1 truncate">{proj.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "project", id: proj.id, name: proj.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">No projects yet</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-project")} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side - can add notifications, search, etc. later */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/artifacts/new")}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Artifact</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Session Recovery Dialog */}
      <SessionRecoveryDialog
        open={sessionExpired}
        onRecovered={handleRecovered}
        userEmail={lastEmail}
      />

      {/* Delete Confirm Dialog */}
      {deleteDialog && (
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => {
            if (!open) setDeleteDialog(null);
          }}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${deleteDialog.type === "workspace" ? "Workspace" : "Project"}`}
          entityName={deleteDialog.name}
          entityType={deleteDialog.type}
          isDeleting={deleteWorkspaceMutation.isPending || deleteProjectMutation.isPending}
        />
      )}
    </div>
  );
}
