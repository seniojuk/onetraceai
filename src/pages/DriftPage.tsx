import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

interface DriftFinding {
  id: string;
  type: "UNTRACED_COMMIT" | "MISSING_TESTS" | "STATUS_MISMATCH" | "ORPHAN_ARTIFACT" | "STALE_REQUIREMENT";
  title: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "RESOLVED" | "IGNORED";
  artifactId?: string;
  artifactShortId?: string;
  evidence?: string;
  detectedAt: string;
}

// Mock drift findings
const mockFindings: DriftFinding[] = [
  {
    id: "1",
    type: "UNTRACED_COMMIT",
    title: "Commit abc123 has no linked requirement",
    description: "A commit was pushed that doesn't reference any story or AC in its message.",
    severity: "HIGH",
    status: "OPEN",
    evidence: "Commit: feat: add payment processing logic",
    detectedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    type: "MISSING_TESTS",
    title: "STORY-004 has 0/3 ACs tested",
    description: "This story has acceptance criteria but no test cases linked to them.",
    severity: "MEDIUM",
    status: "OPEN",
    artifactShortId: "STORY-004",
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    type: "STATUS_MISMATCH",
    title: "STORY-002 status out of sync with Jira",
    description: "The story shows as Done here but In Review in Jira.",
    severity: "LOW",
    status: "OPEN",
    artifactShortId: "STORY-002",
    evidence: "OneTrace: DONE, Jira: IN_REVIEW",
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "4",
    type: "ORPHAN_ARTIFACT",
    title: "AC-015 has no parent story",
    description: "This acceptance criterion is not linked to any user story.",
    severity: "MEDIUM",
    status: "RESOLVED",
    artifactShortId: "AC-015",
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "5",
    type: "STALE_REQUIREMENT",
    title: "PRD-001 not updated in 30+ days",
    description: "This requirement document may be outdated and should be reviewed.",
    severity: "LOW",
    status: "IGNORED",
    artifactShortId: "PRD-001",
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

const DriftPage = () => {
  const navigate = useNavigate();
  const { currentProjectId } = useUIStore();
  
  const [findings, setFindings] = useState<DriftFinding[]>(mockFindings);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openFindings = findings.filter(f => f.status === "OPEN");
  const resolvedFindings = findings.filter(f => f.status === "RESOLVED");
  const ignoredFindings = findings.filter(f => f.status === "IGNORED");

  const filteredFindings = (status: string) => {
    return findings
      .filter(f => f.status === status)
      .filter(f => severityFilter.length === 0 || severityFilter.includes(f.severity))
      .filter(f => typeFilter.length === 0 || typeFilter.includes(f.type));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleResolve = (id: string) => {
    setFindings(findings.map(f => 
      f.id === id ? { ...f, status: "RESOLVED" as const } : f
    ));
  };

  const handleIgnore = (id: string) => {
    setFindings(findings.map(f => 
      f.id === id ? { ...f, status: "IGNORED" as const } : f
    ));
  };

  const severityColors = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const typeLabels = {
    UNTRACED_COMMIT: "Untraced Commit",
    MISSING_TESTS: "Missing Tests",
    STATUS_MISMATCH: "Status Mismatch",
    ORPHAN_ARTIFACT: "Orphan Artifact",
    STALE_REQUIREMENT: "Stale Requirement",
  };

  const renderFindingCard = (finding: DriftFinding) => (
    <Card key={finding.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn(severityColors[finding.severity])}>
                {finding.severity}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {typeLabels[finding.type]}
              </Badge>
              {finding.artifactShortId && (
                <span className="font-mono text-xs text-muted-foreground">
                  {finding.artifactShortId}
                </span>
              )}
            </div>
            <h4 className="font-medium text-foreground mb-1">{finding.title}</h4>
            <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
            {finding.evidence && (
              <p className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block">
                {finding.evidence}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Detected {new Date(finding.detectedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {finding.status === "OPEN" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleResolve(finding.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Resolve
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleIgnore(finding.id)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Ignore
                </Button>
              </>
            )}
            {finding.artifactShortId && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => navigate(`/artifacts?search=${finding.artifactShortId}`)}
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
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                Scan
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
