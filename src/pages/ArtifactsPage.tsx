import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon,
  FileText,
  Lightbulb,
  GitBranch,
  CheckCircle2,
  Bug,
  TestTube2,
  Loader2,
  MoreVertical,
  ArrowUpDown,
  Download,
  X,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts, ArtifactType, ArtifactStatus, Artifact } from "@/hooks/useArtifacts";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { downloadExport, ExportFormat } from "@/utils/artifactExport";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilesSection } from "@/components/files/FilesSection";

const artifactTypeConfig: Record<ArtifactType, { icon: React.ElementType; color: string; label: string }> = {
  IDEA: { icon: Lightbulb, color: "bg-yellow-100 text-yellow-800", label: "Idea" },
  PRD: { icon: FileText, color: "bg-purple-100 text-purple-800", label: "PRD" },
  EPIC: { icon: GitBranch, color: "bg-blue-100 text-blue-800", label: "Epic" },
  STORY: { icon: FileText, color: "bg-teal-100 text-teal-800", label: "Story" },
  ACCEPTANCE_CRITERION: { icon: CheckCircle2, color: "bg-green-100 text-green-800", label: "AC" },
  TEST_CASE: { icon: TestTube2, color: "bg-amber-100 text-amber-800", label: "Test" },
  TEST_SUITE: { icon: TestTube2, color: "bg-orange-100 text-orange-800", label: "Suite" },
  CODE_MODULE: { icon: GitBranch, color: "bg-slate-100 text-slate-800", label: "Module" },
  COMMIT: { icon: GitBranch, color: "bg-gray-100 text-gray-800", label: "Commit" },
  PULL_REQUEST: { icon: GitBranch, color: "bg-indigo-100 text-indigo-800", label: "PR" },
  BUG: { icon: Bug, color: "bg-red-100 text-red-800", label: "Bug" },
  DECISION: { icon: FileText, color: "bg-cyan-100 text-cyan-800", label: "Decision" },
  RELEASE: { icon: GitBranch, color: "bg-emerald-100 text-emerald-800", label: "Release" },
  DEPLOYMENT: { icon: GitBranch, color: "bg-violet-100 text-violet-800", label: "Deploy" },
  FILE: { icon: FileText, color: "bg-stone-100 text-stone-800", label: "File" },
};

const statusConfig: Record<ArtifactStatus, { color: string; label: string }> = {
  DRAFT: { color: "bg-slate-100 text-slate-700", label: "Draft" },
  ACTIVE: { color: "bg-blue-100 text-blue-700", label: "Active" },
  IN_PROGRESS: { color: "bg-amber-100 text-amber-700", label: "In Progress" },
  BLOCKED: { color: "bg-red-100 text-red-700", label: "Blocked" },
  DONE: { color: "bg-green-100 text-green-700", label: "Done" },
  ARCHIVED: { color: "bg-gray-100 text-gray-700", label: "Archived" },
};

const ArtifactsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") as ArtifactType | null;
  const activeTab = searchParams.get("tab") || "artifacts";
  
  const { currentProjectId, currentWorkspaceId, artifactTypeFilter, setArtifactTypeFilter, statusFilter, setStatusFilter } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);
  
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "title">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());

  // Filter out FILE type from main artifacts list and apply filters
  const filteredArtifacts = artifacts?.filter(artifact => {
    // Exclude FILE artifacts from the main list
    if (artifact.type === "FILE") return false;
    
    const matchesSearch = search === "" || 
      artifact.title.toLowerCase().includes(search.toLowerCase()) ||
      artifact.short_id.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter 
      ? artifact.type === typeFilter 
      : artifactTypeFilter.length === 0 || artifactTypeFilter.includes(artifact.type);
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(artifact.status);
    
    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title);
    } else {
      comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  }) || [];

  const handleCreateArtifact = (type?: ArtifactType) => {
    const params = type ? `?type=${type}` : "";
    navigate(`/artifacts/new${params}`);
  };

  const handleToggleSelect = (artifactId: string) => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(artifactId)) {
        next.delete(artifactId);
      } else {
        next.add(artifactId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedArtifacts(new Set(filteredArtifacts.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedArtifacts(new Set());
  };

  const handleExport = (format: ExportFormat) => {
    const artifactsToExport = filteredArtifacts.filter((a) => selectedArtifacts.has(a.id));
    if (artifactsToExport.length === 0) {
      toast.error("No artifacts selected for export");
      return;
    }
    downloadExport(artifactsToExport, format, `onetraceai-artifacts-${new Date().toISOString().split("T")[0]}`);
    toast.success(`Exported ${artifactsToExport.length} artifact(s) as ${format.toUpperCase()}`);
  };

  const selectedCount = selectedArtifacts.size;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          {/* Tabs for Artifacts and Files */}
          <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Artifacts</h1>
                <p className="text-muted-foreground">
                  Manage your project artifacts and files
                </p>
              </div>
              <TabsList>
                <TabsTrigger value="artifacts" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Artifacts
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Files
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="artifacts" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-muted-foreground">
              {filteredArtifacts.length} artifacts in this project
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Artifact
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleCreateArtifact("PRD")}>
                  <FileText className="w-4 h-4 mr-2" />
                  PRD
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateArtifact("EPIC")}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Epic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateArtifact("STORY")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Story
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCreateArtifact("IDEA")}>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Idea
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateArtifact("BUG")}>
                  <Bug className="w-4 h-4 mr-2" />
                  Bug
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search artifacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Type
                    {artifactTypeFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{artifactTypeFilter.length}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(artifactTypeConfig).map(([type, config]) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={artifactTypeFilter.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setArtifactTypeFilter([...artifactTypeFilter, type]);
                        } else {
                          setArtifactTypeFilter(artifactTypeFilter.filter(t => t !== type));
                        }
                      }}
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {artifactTypeFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setArtifactTypeFilter([])}>
                        Clear filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Status
                    {statusFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{statusFilter.length}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatusFilter([...statusFilter, status]);
                        } else {
                          setStatusFilter(statusFilter.filter(s => s !== status));
                        }
                      }}
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-2", config.color.split(" ")[0])} />
                      {config.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {statusFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStatusFilter([])}>
                        Clear filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("desc"); }}>
                    Newest first
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("asc"); }}>
                    Oldest first
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("updated_at"); setSortOrder("desc"); }}>
                    Recently updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("title"); setSortOrder("asc"); }}>
                    Title A-Z
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("rounded-none", viewMode === "list" && "bg-muted")}
                  onClick={() => setViewMode("list")}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("rounded-none", viewMode === "grid" && "bg-muted")}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{selectedCount} selected</span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select all ({filteredArtifacts.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("markdown")}>
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : filteredArtifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No artifacts found</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {search || artifactTypeFilter.length > 0 || statusFilter.length > 0
                  ? "Try adjusting your filters or search query"
                  : "Create your first artifact to start building your project"}
              </p>
              <Button onClick={() => handleCreateArtifact()} className="bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Artifact
              </Button>
            </div>
          ) : viewMode === "list" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredArtifacts.length > 0 && filteredArtifacts.every((a) => selectedArtifacts.has(a.id))}
                        onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
                      />
                    </TableHead>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArtifacts.map((artifact) => {
                    const typeConfig = artifactTypeConfig[artifact.type as ArtifactType];
                    const status = statusConfig[artifact.status as ArtifactStatus];
                      return (
                      <TableRow 
                        key={artifact.id} 
                        className={cn("cursor-pointer hover:bg-muted/50", selectedArtifacts.has(artifact.id) && "bg-accent/5")}
                        onClick={() => navigate(`/artifacts/${artifact.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedArtifacts.has(artifact.id)}
                            onCheckedChange={() => handleToggleSelect(artifact.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {artifact.short_id}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", typeConfig?.color)}>
                            {typeConfig?.icon && <typeConfig.icon className="w-3 h-3" />}
                            {typeConfig?.label || artifact.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{artifact.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(status?.color)}>
                            {status?.label || artifact.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(artifact.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/artifacts/${artifact.id}`); }}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/artifacts/${artifact.id}/edit`); }}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/graph?focus=${artifact.id}`); }}>
                                View in Graph
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredArtifacts.map((artifact) => {
                const typeConfig = artifactTypeConfig[artifact.type as ArtifactType];
                const status = statusConfig[artifact.status as ArtifactStatus];
                return (
                  <Card 
                    key={artifact.id}
                    className={cn("cursor-pointer card-hover relative", selectedArtifacts.has(artifact.id) && "ring-2 ring-accent")}
                    onClick={() => navigate(`/artifacts/${artifact.id}`)}
                  >
                    <div 
                      className="absolute top-3 left-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedArtifacts.has(artifact.id)}
                        onCheckedChange={() => handleToggleSelect(artifact.id)}
                      />
                    </div>
                    <CardContent className="p-4 pl-10">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={cn("gap-1", typeConfig?.color)}>
                          {typeConfig?.icon && <typeConfig.icon className="w-3 h-3" />}
                          {typeConfig?.label || artifact.type}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{artifact.short_id}</span>
                      </div>
                      <h3 className="font-medium text-foreground mb-2 line-clamp-2">{artifact.title}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn("text-xs", status?.color)}>
                          {status?.label || artifact.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(artifact.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-6">
              <FilesSection />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default ArtifactsPage;
