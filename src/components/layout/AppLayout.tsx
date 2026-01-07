import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
  Menu,
  X
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
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Artifacts", path: "/artifacts" },
  { icon: GitBranch, label: "Graph", path: "/graph" },
  { icon: BarChart3, label: "Coverage", path: "/coverage" },
  { icon: AlertTriangle, label: "Drift", path: "/drift" },
  { icon: Sparkles, label: "AI Runs", path: "/ai-runs" },
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
                    className={cn(ws.id === currentWorkspaceId && "bg-accent/10")}
                  >
                    {ws.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/onboarding")}>
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
                        className={cn(proj.id === currentProjectId && "bg-accent/10")}
                      >
                        <span className="text-xs text-muted-foreground mr-2">{proj.project_key}</span>
                        {proj.name}
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

          {!sidebarCollapsed && (
            <>
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
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
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
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {children}
      </main>
    </div>
  );
}
