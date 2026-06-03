import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link, NavLink } from "react-router-dom";
import {
  Network,
  LayoutDashboard,
  FileText,
  GitBranch,
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
  Shield,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Artifacts", path: "/artifacts" },
  { icon: GitBranch, label: "Graph & Lineage", path: "/graph" },
  { icon: BarChart3, label: "Coverage", path: "/coverage" },
  { icon: AlertTriangle, label: "Drift", path: "/drift" },
];

const aiNav = [
  { icon: Sparkles, label: "AI Agents", path: "/ai-agents" },
  { icon: Wand2, label: "Prompt Gen", path: "/prompt-generator" },
];

const workspaceNav = [
  { icon: Plug, label: "Integrations", path: "/integrations" },
  { icon: Users, label: "Team", path: "/team" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <InnerLayout>{children}</InnerLayout>
    </SidebarProvider>
  );
}

function InnerLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionExpired, lastEmail, handleRecovered } = useSessionRecovery();
  const {
    currentWorkspaceId,
    currentProjectId,
    setCurrentWorkspace,
    setCurrentProject,
  } = useUIStore();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspace(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId, setCurrentWorkspace]);

  useEffect(() => {
    if (projects && projects.length > 0 && !currentProjectId) {
      setCurrentProject(projects[0].id);
    }
  }, [projects, currentProjectId, setCurrentProject]);

  const currentWorkspace = workspaces?.find((w) => w.id === currentWorkspaceId);
  const currentProject = projects?.find((p) => p.id === currentProjectId);

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
          const remaining = workspaces?.filter((w) => w.id !== deleteDialog.id);
          setCurrentWorkspace(remaining?.[0]?.id || null);
        }
        toast.success("Workspace deleted");
      } else {
        await deleteProjectMutation.mutateAsync({
          projectId: deleteDialog.id,
          workspaceId: currentWorkspaceId!,
        });
        if (currentProjectId === deleteDialog.id) {
          const remaining = projects?.filter((p) => p.id !== deleteDialog.id);
          setCurrentProject(remaining?.[0]?.id || null);
        }
        toast.success("Project deleted");
      }
      setDeleteDialog(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path));

  const renderNavGroup = (label: string, items: typeof primaryNav) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 font-medium">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={collapsed ? item.label : undefined}
                  className={cn(
                    "relative h-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground",
                    "data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[2px] data-[active=true]:before:bg-accent data-[active=true]:before:rounded-r-full"
                  )}
                >
                  <NavLink to={item.path}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-[13px]">{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-3 h-14 flex-row items-center">
          <Link to="/dashboard" className="flex items-center gap-2.5 w-full overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-accent-foreground" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
                OneTrace
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {renderNavGroup("Workspace", primaryNav)}
          {renderNavGroup("Intelligence", aiNav)}
          {renderNavGroup("Settings", workspaceNav)}

          {isPlatformAdmin && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/admin"}
                      tooltip={collapsed ? "Platform Admin" : undefined}
                      className="h-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                    >
                      <NavLink to="/admin">
                        <Shield className="w-4 h-4 shrink-0" />
                        <span className="text-[13px]">Platform Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 w-full rounded-md p-1.5 hover:bg-sidebar-accent transition-colors text-left",
                  collapsed && "justify-center"
                )}
              >
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-medium">
                    {getInitials(user?.user_metadata?.full_name || user?.email || "U")}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-sidebar-foreground truncate leading-tight">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">
                      {user?.email}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Command bar header */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border mx-1" />

            {/* Workspace switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-[13px] font-medium hover:bg-muted"
                >
                  <div className="w-4 h-4 rounded-sm bg-accent/15 flex items-center justify-center text-[9px] font-bold text-accent">
                    {currentWorkspace?.name?.charAt(0) || "W"}
                  </div>
                  <span className="truncate max-w-[140px]">
                    {currentWorkspace?.name || "Select workspace"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Workspaces
                </div>
                {loadingWorkspaces ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">Loading…</div>
                ) : (
                  workspaces?.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => setCurrentWorkspace(ws.id)}
                      className={cn("cursor-pointer group", ws.id === currentWorkspaceId && "bg-accent/10 text-accent")}
                    >
                      <div className="w-5 h-5 rounded-sm bg-accent/15 flex items-center justify-center text-[10px] font-bold text-accent mr-2">
                        {ws.name?.charAt(0) || "W"}
                      </div>
                      <span className="flex-1 truncate text-[13px]">{ws.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "workspace", id: ws.id, name: ws.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-workspace")} className="cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-muted-foreground/40 text-sm">/</span>

            {/* Project switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-[13px] font-medium hover:bg-muted">
                  {currentProject?.project_key && (
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {currentProject.project_key}
                    </span>
                  )}
                  <span className="truncate max-w-[160px]">
                    {currentProject?.name || "Select project"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects in {currentWorkspace?.name || "workspace"}
                </div>
                {loadingProjects ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">Loading…</div>
                ) : projects && projects.length > 0 ? (
                  projects.map((proj) => (
                    <DropdownMenuItem
                      key={proj.id}
                      onClick={() => setCurrentProject(proj.id)}
                      className={cn("cursor-pointer group", proj.id === currentProjectId && "bg-accent/10 text-accent")}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0">{proj.project_key}</span>
                      <span className="flex-1 truncate text-[13px]">{proj.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "project", id: proj.id, name: proj.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">No projects yet</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding?step=create-project")} className="cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  New project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[13px]"
              onClick={() => navigate("/artifacts/new")}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New artifact</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 animate-fade-in">{children}</div>
      </main>

      <SessionRecoveryDialog
        open={sessionExpired}
        onRecovered={handleRecovered}
        userEmail={lastEmail}
      />

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
