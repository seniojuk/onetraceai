import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useUIStore } from "@/store/uiStore";
import { useDriftFindings, useResolveDriftFinding, useIgnoreDriftFinding, type DriftFinding } from "@/hooks/useDriftFindings";
import { useComputeCoverage } from "@/hooks/useCoverage";
import { useArtifacts } from "@/hooks/useArtifacts";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const severityLabel = (sev: number | null) => {
  if (sev === 3) return "HIGH";
  if (sev === 2) return "MEDIUM";
  return "LOW";
};

const severityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-blue-100 text-blue-700 border-blue-200",
};

const typeLabels: Record<string, string> = {
  COVERAGE_GAP: "Coverage Gap",
  UNTRACED_COMMIT: "Untraced Commit",
  MISSING_TESTS: "Missing Tests",
  STATUS_MISMATCH: "Status Mismatch",
  ORPHAN_ARTIFACT: "Orphan Artifact",
  STALE_REQUIREMENT: "Stale Requirement",
};

const DriftPage = () => {
  const navigate = useNavigate();
  const { currentProjectId, currentWorkspaceId } = useUIStore();
  
  const { data: findings = [], isLoading } = useDriftFindings(currentProjectId || undefined);
  const { data: artifacts } = useArtifacts(currentProjectId || undefined);
  const resolveFinding = useResolveDriftFinding();
  const ignoreFinding = useIgnoreDriftFinding();
  const computeCoverage = useComputeCoverage();

  const [severityFilter, setSeverityFilter] = useState<string[]>([]);

  // Build artifact lookup for short_ids
  const artifactMap = new Map<string, { short_id: string; title: string }>();
  for (const a of artifacts || []) {
    artifactMap.set(a.id, { short_id: a.short_id, title: a.title });
  }

  const openFindings = findings.filter(f => f.status === "OPEN");
  const resolvedFindings = findings.filter(f => f.status === "RESOLVED");
  const ignoredFindings = findings.filter(f => f.status === "IGNORED");

  const filteredFindings = (status: string) => {
    return findings
      .filter(f => f.status === status)
      .filter(f => severityFilter.length === 0 || severityFilter.includes(severityLabel(f.severity)));
  };

  const handleScan = async () => {
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
        title: "Scan complete",
        description: `${result.drift_findings_created} new drift findings detected.`,
      });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    }
  };

  const handleResolve = (id: string) => {
    resolveFinding.mutate({ findingId: id }, {
      onSuccess: () => toast({ title: "Finding resolved" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleIgnore = (id: string) => {
    ignoreFinding.mutate({ findingId: id }, {
      onSuccess: () => toast({ title: "Finding ignored" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const renderFindingCard = (finding: DriftFinding) => {
    const sevLabel = severityLabel(finding.severity);
    const primaryArtifact = finding.primary_artifact_id ? artifactMap.get(finding.primary_artifact_id) : null;

    return (
      <Card key={finding.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn(severityColors[sevLabel])}>
                  {sevLabel}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {typeLabels[finding.type] || finding.type}
                </Badge>
                {primaryArtifact && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {primaryArtifact.short_id}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-foreground mb-1">{finding.title}</h4>
              {finding.description && (
                <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
              )}
              {finding.evidence && (
                <div className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block">
                  Coverage: {Math.round((finding.evidence.coverage_ratio ?? 0) * 100)}% 
                  (threshold: {Math.round((finding.evidence.threshold ?? 0.7) * 100)}%)
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Detected {finding.detected_at ? new Date(finding.detected_at).toLocaleString() : "unknown"}
              </p>
              {finding.resolution_note && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Note: {finding.resolution_note}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {finding.status === "OPEN" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleResolve(finding.id)}
                    disabled={resolveFinding.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Resolve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleIgnore(finding.id)}
                    disabled={ignoreFinding.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Ignore
                  </Button>
                </>
              )}
              {finding.primary_artifact_id && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => navigate(`/artifacts/${finding.primary_artifact_id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
              <h1 className="text-3xl font-bold text-foreground">Drift Detection</h1>
              <p className="text-muted-foreground">
                Monitor and resolve discrepancies in your artifact graph
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Severity
                    {severityFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{severityFilter.length}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {["HIGH", "MEDIUM", "LOW"].map(sev => (
                    <DropdownMenuCheckboxItem
                      key={sev}
                      checked={severityFilter.includes(sev)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSeverityFilter([...severityFilter, sev]);
                        } else {
                          setSeverityFilter(severityFilter.filter(s => s !== sev));
                        }
                      }}
                    >
                      {sev}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                onClick={handleScan}
                disabled={computeCoverage.isPending}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", computeCoverage.isPending && "animate-spin")} />
                {computeCoverage.isPending ? "Scanning…" : "Scan"}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card className={cn(openFindings.length > 0 && "border-drift/50 bg-drift/5")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-drift/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-drift" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{openFindings.length}</p>
                    <p className="text-sm text-muted-foreground">Open Issues</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{resolvedFindings.length}</p>
                    <p className="text-sm text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{ignoredFindings.length}</p>
                    <p className="text-sm text-muted-foreground">Ignored</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open" className="gap-2">
                Open
                {openFindings.length > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">{openFindings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="ignored">Ignored</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-6">
              {filteredFindings("OPEN").length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No open drift issues</h3>
                    <p className="text-muted-foreground">Your artifact graph is in sync!</p>
                  </CardContent>
                </Card>
              ) : (
                filteredFindings("OPEN").map(renderFindingCard)
              )}
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              {filteredFindings("RESOLVED").length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No resolved issues yet</p>
                  </CardContent>
                </Card>
              ) : (
                filteredFindings("RESOLVED").map(renderFindingCard)
              )}
            </TabsContent>

            <TabsContent value="ignored" className="mt-6">
              {filteredFindings("IGNORED").length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No ignored issues</p>
                  </CardContent>
                </Card>
              ) : (
                filteredFindings("IGNORED").map(renderFindingCard)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default DriftPage;
