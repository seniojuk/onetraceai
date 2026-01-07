import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const CoveragePage = () => {
  const navigate = useNavigate();
  const { currentProjectId } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate coverage stats
  const stories = artifacts?.filter(a => a.type === "STORY") || [];
  const acs = artifacts?.filter(a => a.type === "ACCEPTANCE_CRITERION") || [];
  const tests = artifacts?.filter(a => a.type === "TEST_CASE") || [];
  
  const totalACs = acs.length;
  const testedACs = tests.length; // Simplified - in real app would check edges
  const satisfiedACs = acs.filter(ac => ac.status === "DONE").length;
  
  const coveragePercent = totalACs > 0 ? Math.round((satisfiedACs / totalACs) * 100) : 0;
  const testCoveragePercent = totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0;

  // Mock coverage data per epic/story for demo
  const coverageByStory = stories.map(story => {
    const storyACs = Math.floor(Math.random() * 5) + 1;
    const satisfied = Math.floor(Math.random() * storyACs);
    const tested = Math.floor(Math.random() * storyACs);
    return {
      id: story.id,
      shortId: story.short_id,
      title: story.title,
      totalACs: storyACs,
      satisfiedACs: satisfied,
      testedACs: tested,
      coverage: Math.round((satisfied / storyACs) * 100),
      status: story.status,
    };
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Coverage</h1>
              <p className="text-muted-foreground">
                Track acceptance criteria satisfaction and test coverage
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Overall Coverage</span>
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{coveragePercent}%</p>
                <Progress 
                  value={coveragePercent} 
                  className="mt-2 h-2 [&>div]:bg-success"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Test Coverage</span>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{testCoveragePercent}%</p>
                <Progress 
                  value={testCoveragePercent} 
                  className="mt-2 h-2 [&>div]:bg-accent"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Total ACs</span>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalACs}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {satisfiedACs} satisfied
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Untested</span>
                  <div className="w-10 h-10 rounded-lg bg-drift/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-drift" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalACs - testedACs}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ACs need tests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coverage by Story */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage by Story</CardTitle>
              <CardDescription>
                Acceptance criteria satisfaction per user story
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coverageByStory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No stories yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate("/artifacts/new?type=STORY")}
                  >
                    Create Story
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">ID</TableHead>
                      <TableHead>Story</TableHead>
                      <TableHead className="w-32">ACs</TableHead>
                      <TableHead className="w-40">Coverage</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverageByStory.map((story) => (
                      <TableRow 
                        key={story.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/artifacts/${story.id}`)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {story.shortId}
                        </TableCell>
                        <TableCell className="font-medium">{story.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {story.satisfiedACs}/{story.totalACs}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({story.testedACs} tested)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={story.coverage} 
                              className={cn(
                                "w-20 h-2",
                                story.coverage === 100 
                                  ? "[&>div]:bg-success" 
                                  : story.coverage >= 70 
                                    ? "[&>div]:bg-amber-500" 
                                    : "[&>div]:bg-red-500"
                              )}
                            />
                            <span className={cn(
                              "text-sm font-medium w-12",
                              story.coverage === 100 
                                ? "text-success" 
                                : story.coverage >= 70 
                                  ? "text-amber-600" 
                                  : "text-red-600"
                            )}>
                              {story.coverage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            story.status === "DONE" ? "bg-green-100 text-green-700" :
                            story.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {story.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default CoveragePage;
