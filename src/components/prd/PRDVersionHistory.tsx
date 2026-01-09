import { useState } from "react";
import { History, ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useArtifactVersions, ArtifactVersion } from "@/hooks/useArtifactVersions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PRDVersionHistoryProps {
  artifactId: string;
}

export const PRDVersionHistory = ({ artifactId }: PRDVersionHistoryProps) => {
  const { data: versions, isLoading } = useArtifactVersions(artifactId);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleVersion = (versionId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Previous versions of this PRD will appear here after enhancements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No previous versions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Version History
        </CardTitle>
        <CardDescription>
          {versions.length} previous version{versions.length !== 1 ? "s" : ""} available
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {versions.map((version) => (
              <Collapsible
                key={version.id}
                open={expandedVersions.has(version.id)}
                onOpenChange={() => toggleVersion(version.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Version {version.version_number}</span>
                            <Badge variant="outline" className="text-xs">
                              v{version.version_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {expandedVersions.has(version.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      <div className="text-sm">
                        <span className="font-medium">Title:</span>{" "}
                        <span className="text-muted-foreground">{version.title}</span>
                      </div>
                      {version.enhancement_details && (
                        <div className="text-sm">
                          <span className="font-medium">Enhancement Request:</span>
                          <p className="text-muted-foreground mt-1 p-2 bg-muted rounded">
                            {version.enhancement_details}
                          </p>
                        </div>
                      )}
                      {version.content_markdown && (
                        <div className="text-sm">
                          <span className="font-medium">Content Preview:</span>
                          <ScrollArea className="h-[200px] mt-1 p-2 bg-muted rounded">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {version.content_markdown}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
