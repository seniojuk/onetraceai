import { useNavigate } from "react-router-dom";
import { AlertTriangle, TestTube2, CircleDot, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Artifact {
  id: string;
  short_id: string;
  title: string;
  type: string;
  status: string | null;
  parent_artifact_id: string | null;
}

interface CoverageGapReportProps {
  untestedAcIds: string[];
  unsatisfiedAcIds: string[];
  artifacts: Artifact[];
}

const CoverageGapReport = ({ untestedAcIds, unsatisfiedAcIds, artifacts }: CoverageGapReportProps) => {
  const navigate = useNavigate();

  const artifactMap = new Map(artifacts.map(a => [a.id, a]));

  const untestedAcs = untestedAcIds
    .map(id => artifactMap.get(id))
    .filter(Boolean) as Artifact[];

  const unsatisfiedAcs = unsatisfiedAcIds
    .map(id => artifactMap.get(id))
    .filter(Boolean) as Artifact[];

  // Find parent story for each AC
  const getParentStory = (ac: Artifact) => {
    if (ac.parent_artifact_id) {
      const parent = artifactMap.get(ac.parent_artifact_id);
      if (parent?.type === "STORY") return parent;
    }
    return null;
  };

  if (untestedAcs.length === 0 && unsatisfiedAcs.length === 0) {
    return null;
  }

  const renderAcRow = (ac: Artifact) => {
    const parentStory = getParentStory(ac);
    return (
      <TableRow
        key={ac.id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => navigate(`/artifacts/${ac.id}`)}
      >
        <TableCell className="font-mono text-xs text-muted-foreground">
          {ac.short_id}
        </TableCell>
        <TableCell className="font-medium">{ac.title}</TableCell>
        <TableCell>
          {parentStory ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/artifacts/${parentStory.id}`);
              }}
            >
              {parentStory.short_id}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={
            ac.status === "DONE" ? "bg-success/10 text-success" :
            ac.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-600" :
            "bg-muted text-muted-foreground"
          }>
            {ac.status || "DRAFT"}
          </Badge>
        </TableCell>
        <TableCell>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Coverage Gap Report
        </CardTitle>
        <CardDescription>
          Acceptance criteria that need attention — untested or unsatisfied
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="untested">
          <TabsList>
            <TabsTrigger value="untested" className="gap-1.5">
              <TestTube2 className="w-3.5 h-3.5" />
              Untested ({untestedAcs.length})
            </TabsTrigger>
            <TabsTrigger value="unsatisfied" className="gap-1.5">
              <CircleDot className="w-3.5 h-3.5" />
              Unsatisfied ({unsatisfiedAcs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="untested">
            {untestedAcs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                All acceptance criteria have test cases. 🎉
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Acceptance Criterion</TableHead>
                    <TableHead className="w-24">Story</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {untestedAcs.map(renderAcRow)}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="unsatisfied">
            {unsatisfiedAcs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                All acceptance criteria are satisfied. 🎉
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Acceptance Criterion</TableHead>
                    <TableHead className="w-24">Story</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unsatisfiedAcs.map(renderAcRow)}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CoverageGapReport;
