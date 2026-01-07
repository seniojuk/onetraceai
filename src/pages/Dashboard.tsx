import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  GitBranch, 
  BarChart3, 
  AlertTriangle,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentProjectId, setShowOnboarding } = useUIStore();
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: projects, isLoading: loadingProjects } = useProjects(currentWorkspaceId || undefined);
  const { data: artifacts, isLoading: loadingArtifacts } = useArtifacts(currentProjectId || undefined);

  // Show onboarding if no workspaces
  useEffect(() => {
    if (!loadingWorkspaces && (!workspaces || workspaces.length === 0)) {
      setShowOnboarding(true);
      navigate("/onboarding");
    }
  }, [workspaces, loadingWorkspaces, setShowOnboarding, navigate]);

  if (loadingWorkspaces || loadingProjects) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-muted-foreground">Loading your workspace...</p>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  // Calculate stats
  const prdCount = artifacts?.filter(a => a.type === "PRD").length || 0;
  const epicCount = artifacts?.filter(a => a.type === "EPIC").length || 0;
  const storyCount = artifacts?.filter(a => a.type === "STORY").length || 0;
  const acCount = artifacts?.filter(a => a.type === "ACCEPTANCE_CRITERION").length || 0;
  const doneCount = artifacts?.filter(a => a.status === "DONE").length || 0;
  const inProgressCount = artifacts?.filter(a => a.status === "IN_PROGRESS").length || 0;
  const totalArtifacts = artifacts?.length || 0;
  
  // Mock coverage/drift data for demo
  const coveragePercent = totalArtifacts > 0 ? Math.round((doneCount / totalArtifacts) * 100) : 0;
  const driftCount = 3;

  const currentProject = projects?.find(p => p.id === currentProjectId);

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {currentProject ? currentProject.name : "Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {currentProject 
                ? `Project ${currentProject.project_key} • Track coverage, manage artifacts, and catch drift`
                : "Select a project to get started"
              }
            </p>
          </div>

          {!currentProject ? (
            // Empty state - no project selected
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <Network className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No project selected</h2>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Create your first project to start building traceable software with AI assistance.
              </p>
              <Button onClick={() => navigate("/onboarding")} className="bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                  title="Coverage"
                  value={`${coveragePercent}%`}
                  subtitle={`${doneCount}/${totalArtifacts} artifacts complete`}
                  icon={BarChart3}
                  trend={+8}
                  color="success"
                />
                <StatsCard
                  title="Drift Findings"
                  value={driftCount.toString()}
                  subtitle="Open issues to review"
                  icon={AlertTriangle}
                  trend={-2}
                  color="drift"
                />
                <StatsCard
                  title="Stories"
                  value={storyCount.toString()}
                  subtitle={`${inProgressCount} in progress`}
                  icon={FileText}
                  color="accent"
                />
                <StatsCard
                  title="Acceptance Criteria"
                  value={acCount.toString()}
                  subtitle={`From ${storyCount} stories`}
                  icon={CheckCircle2}
                  color="primary"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Coverage Overview */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Coverage Overview</CardTitle>
                      <CardDescription>Acceptance criteria satisfaction by Epic</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/coverage")}>
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "User Authentication", coverage: 85, total: 12, satisfied: 10 },
                        { name: "Payment Integration", coverage: 60, total: 8, satisfied: 5 },
                        { name: "Dashboard Views", coverage: 100, total: 6, satisfied: 6 },
                        { name: "API Layer", coverage: 45, total: 15, satisfied: 7 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                              <span className="text-xs text-muted-foreground">{item.satisfied}/{item.total} ACs</span>
                            </div>
                            <Progress 
                              value={item.coverage} 
                              className={`h-2 ${
                                item.coverage === 100 
                                  ? '[&>div]:bg-coverage-full' 
                                  : item.coverage >= 70 
                                    ? '[&>div]:bg-coverage-partial' 
                                    : '[&>div]:bg-coverage-none'
                              }`}
                            />
                          </div>
                          <span className={`text-sm font-medium w-12 text-right ${
                            item.coverage === 100 
                              ? 'text-coverage-full' 
                              : item.coverage >= 70 
                                ? 'text-coverage-partial' 
                                : 'text-coverage-none'
                          }`}>
                            {item.coverage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Drift Findings */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Drift Findings</CardTitle>
                      <CardDescription>Issues requiring attention</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/drift")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { type: "Untraced commit", desc: "abc123 has no linked requirement", severity: "high" },
                        { type: "Missing tests", desc: "STORY-004 has 0/3 ACs tested", severity: "medium" },
                        { type: "Status mismatch", desc: "STORY-002 is Done but Jira shows In Review", severity: "low" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            item.severity === 'high' ? 'bg-red-500' : 
                            item.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.type}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                {/* Recent Artifacts */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Artifacts</CardTitle>
                      <CardDescription>Latest updates to your project</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/artifacts")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingArtifacts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : artifacts && artifacts.length > 0 ? (
                      <div className="space-y-3">
                        {artifacts.slice(0, 5).map((artifact) => (
                          <div 
                            key={artifact.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/artifacts/${artifact.id}`)}
                          >
                            <div className={`artifact-badge artifact-badge-${artifact.type.toLowerCase().replace('_', '-')}`}>
                              {artifact.type.replace('_', ' ')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{artifact.title}</p>
                              <p className="text-xs text-muted-foreground">{artifact.short_id}</p>
                            </div>
                            <div className={`status-dot status-dot-${artifact.status.toLowerCase().replace('_', '-')}`} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">No artifacts yet</p>
                        <Button size="sm" onClick={() => navigate("/artifacts/new")}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Artifact
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and shortcuts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <QuickActionCard
                        icon={FileText}
                        title="Create PRD"
                        description="Start from scratch or import"
                        onClick={() => navigate("/artifacts/new?type=PRD")}
                      />
                      <QuickActionCard
                        icon={Sparkles}
                        title="Generate Stories"
                        description="AI-powered decomposition"
                        onClick={() => navigate("/ai-runs/new?type=story")}
                      />
                      <QuickActionCard
                        icon={GitBranch}
                        title="View Graph"
                        description="Explore artifact relationships"
                        onClick={() => navigate("/graph")}
                      />
                      <QuickActionCard
                        icon={BarChart3}
                        title="Run Coverage"
                        description="Compute latest metrics"
                        onClick={() => navigate("/coverage")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: number;
  color: "success" | "drift" | "accent" | "primary";
}

function StatsCard({ title, value, subtitle, icon: Icon, trend, color }: StatsCardProps) {
  const colorClasses = {
    success: "bg-success/10 text-success",
    drift: "bg-drift/10 text-drift",
    accent: "bg-accent/10 text-accent",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <Card className="card-hover">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-xs ${trend >= 0 ? 'text-success' : 'text-drift'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 && 'rotate-180'}`} />
            <span>{trend >= 0 ? '+' : ''}{trend}% this week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Action Card
interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickActionCard({ icon: Icon, title, description, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-accent/30 transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  );
}

export default Dashboard;
