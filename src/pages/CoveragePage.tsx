import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
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
import { useCoverageSnapshots, useCoverageHistory, useComputeCoverage, type CoverageSnapshot } from "@/hooks/useCoverage";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import CoverageGapReport from "@/components/coverage/CoverageGapReport";
import CoverageTrendChart from "@/components/coverage/CoverageTrendChart";

const CoveragePage = () => {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  const { data: artifacts, isLoading: artifactsLoading } = useArtifacts(currentProjectId || undefined);
  const { data: snapshots, isLoading: snapshotsLoading } = useCoverageSnapshots(currentProjectId || undefined);
  const { data: coverageHistory } = useCoverageHistory(currentProjectId || undefined);
  const computeCoverage = useComputeCoverage();

  const isLoading = artifactsLoading || snapshotsLoading;

  // Build a map of artifact_id -> snapshot for quick lookup
  const snapshotMap = new Map<string, CoverageSnapshot>();
  for (const s of snapshots || []) {
    snapshotMap.set(s.artifact_id, s);
  }

  // Get stories from artifacts
  const stories = artifacts?.filter(a => a.type === "STORY") || [];
  const acs = artifacts?.filter(a => a.type === "ACCEPTANCE_CRITERION") || [];
  const tests = artifacts?.filter(a => a.type === "TEST_CASE") || [];

  // Use snapshots for per-story data, fall back to basic counts for project totals
  const hasSnapshots = (snapshots || []).length > 0;

  // Project-level totals from snapshots or basic artifact counts
  let totalACs = 0;
  let satisfiedACs = 0;
  let testedACs = 0;

  if (hasSnapshots) {
    for (const s of snapshots!) {
      totalACs += s.total_acs;
      satisfiedACs += s.satisfied_acs;
      testedACs += s.tested_acs;
    }
  } else {
    totalACs = acs.length;
    satisfiedACs = acs.filter(ac => ac.status === "DONE").length;
    testedACs = tests.length; // rough estimate without edges
  }

  const coveragePercent = totalACs > 0 ? Math.round((satisfiedACs / totalACs) * 100) : 0;
  const testCoveragePercent = totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0;

  // Aggregate all untested/unsatisfied AC IDs from snapshots for gap report
  const allUntestedAcIds = new Set<string>();
  const allUnsatisfiedAcIds = new Set<string>();
  for (const s of snapshots || []) {
    for (const id of s.missing?.untested_ac_ids || []) allUntestedAcIds.add(id);
    for (const id of s.missing?.unsatisfied_ac_ids || []) allUnsatisfiedAcIds.add(id);
  }

  // Build per-story coverage rows
  const coverageByStory = stories.map(story => {
    const snapshot = snapshotMap.get(story.id);
    if (snapshot) {
      return {
        id: story.id,
        shortId: story.short_id,
        title: story.title,
        totalACs: snapshot.total_acs,
        satisfiedACs: snapshot.satisfied_acs,
        testedACs: snapshot.tested_acs,
        coverage: Math.round((snapshot.coverage_ratio ?? 0) * 100),
        status: story.status,
        untestedAcIds: snapshot.missing?.untested_ac_ids || [],
        unsatisfiedAcIds: snapshot.missing?.unsatisfied_ac_ids || [],
      };
    }
    // No snapshot yet — show zeroes
    return {
      id: story.id,
      shortId: story.short_id,
      title: story.title,
      totalACs: 0,
      satisfiedACs: 0,
      testedACs: 0,
      coverage: 0,
      status: story.status,
      untestedAcIds: [],
      unsatisfiedAcIds: [],
    };
  });

  const handleRefresh = async () => {
    if (!currentProjectId || !currentWorkspaceId) {
      toast({ title: "No project selected", description: "Please select a project first.", variant: "destructive" });
      return;
    }
    try {
      const result = await computeCoverage.mutateAsync({
        projectId: currentProjectId,
        workspaceId: currentWorkspaceId,
      });
      toast({
        title: "Coverage recomputed",
        description: `${result.snapshots_created} snapshots saved. ${result.drift_findings_created} drift findings created.`,
      });
    } catch (err: any) {
      toast({ title: "Recomputation failed", description: err.message, variant: "destructive" });
    }
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
              {!hasSnapshots && stories.length > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  No coverage data yet — click Recompute to analyze your artifacts.
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={computeCoverage.isPending}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", computeCoverage.isPending && "animate-spin")} />
              {computeCoverage.isPending ? "Computing…" : "Recompute"}
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
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalACs - testedACs}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ACs need tests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coverage Trend Chart */}
          {coverageHistory && coverageHistory.length >= 2 && (
            <div className="mb-8">
              <CoverageTrendChart history={coverageHistory} />
            </div>
          )}

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
                                    : "[&>div]:bg-destructive"
                              )}
                            />
                            <span className={cn(
                              "text-sm font-medium w-12",
                              story.coverage === 100 
                                ? "text-success" 
                                : story.coverage >= 70 
                                  ? "text-amber-600" 
                                  : "text-destructive"
                            )}>
                              {story.coverage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            story.status === "DONE" ? "bg-success/10 text-success" :
                            story.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-600" :
                            "bg-muted text-muted-foreground"
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

          {/* Coverage Gap Report */}
          {hasSnapshots && (allUntestedAcIds.size > 0 || allUnsatisfiedAcIds.size > 0) && (
            <div className="mt-6">
              <CoverageGapReport
                untestedAcIds={Array.from(allUntestedAcIds)}
                unsatisfiedAcIds={Array.from(allUnsatisfiedAcIds)}
                artifacts={artifacts || []}
              />
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default CoveragePage;
