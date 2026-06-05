import { useState, useMemo, useCallback } from "react";
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
  Paperclip,
  Layers,
  ChevronRight,
  ChevronDown,
  Network,
  ArrowUpRight,
  Boxes,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useArtifacts, ArtifactType, ArtifactStatus, Artifact } from "@/hooks/useArtifacts";
import { useProjectArtifactEdges } from "@/hooks/useArtifactEdges";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { downloadExport, ExportFormat } from "@/utils/artifactExport";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilesSection } from "@/components/files/FilesSection";
import { EpicHierarchyView } from "@/components/epic/EpicHierarchyView";
import { UsageLimitBanner, UsageLimitDialog } from "@/components/billing";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { LinkArtifactDialog } from "@/components/artifacts/LinkArtifactDialog";
import { linkRules } from "@/lib/artifactLinking";

// ─── Type config: maps to design-system tokens (no raw color classes) ──────
type TypeMeta = { icon: React.ElementType; label: string; chip: string };

const artifactTypeConfig: Record<ArtifactType, TypeMeta> = {
  IDEA:                { icon: Lightbulb,   label: "Idea",     chip: "bg-status-test/10 text-status-test-fg border-status-test/20" },
  PRD:                 { icon: FileText,    label: "PRD",      chip: "bg-status-prd/10 text-status-prd-fg border-status-prd/20" },
  EPIC:                { icon: GitBranch,   label: "Epic",     chip: "bg-status-epic/10 text-status-epic-fg border-status-epic/20" },
  STORY:               { icon: FileText,    label: "Story",    chip: "bg-status-story/10 text-status-story-fg border-status-story/20" },
  ACCEPTANCE_CRITERION:{ icon: CheckCircle2,label: "AC",       chip: "bg-status-ac/10 text-status-ac-fg border-status-ac/20" },
  TEST_CASE:           { icon: TestTube2,   label: "Test",     chip: "bg-status-test/10 text-status-test-fg border-status-test/20" },
  TEST_SUITE:          { icon: TestTube2,   label: "Suite",    chip: "bg-status-test/10 text-status-test-fg border-status-test/20" },
  CODE_MODULE:         { icon: GitBranch,   label: "Module",   chip: "bg-status-commit/10 text-status-commit-fg border-status-commit/20" },
  COMMIT:              { icon: GitBranch,   label: "Commit",   chip: "bg-status-commit/10 text-status-commit-fg border-status-commit/20" },
  PULL_REQUEST:        { icon: GitBranch,   label: "PR",       chip: "bg-status-epic/10 text-status-epic-fg border-status-epic/20" },
  BUG:                 { icon: Bug,         label: "Bug",      chip: "bg-destructive/10 text-destructive border-destructive/20" },
  DECISION:            { icon: FileText,    label: "Decision", chip: "bg-status-story/10 text-status-story-fg border-status-story/20" },
  RELEASE:             { icon: GitBranch,   label: "Release",  chip: "bg-status-ac/10 text-status-ac-fg border-status-ac/20" },
  DEPLOYMENT:          { icon: GitBranch,   label: "Deploy",   chip: "bg-status-prd/10 text-status-prd-fg border-status-prd/20" },
  FILE:                { icon: FileText,    label: "File",     chip: "bg-status-commit/10 text-status-commit-fg border-status-commit/20" },
};

const statusConfig: Record<ArtifactStatus, { label: string; dot: string; text: string }> = {
  DRAFT:       { label: "Draft",       dot: "bg-muted-foreground/40",          text: "text-muted-foreground" },
  ACTIVE:      { label: "Active",      dot: "bg-accent",                       text: "text-foreground" },
  IN_PROGRESS: { label: "In progress", dot: "bg-coverage-partial animate-pulse", text: "text-foreground" },
  BLOCKED:     { label: "Blocked",     dot: "bg-destructive",                  text: "text-destructive" },
  DONE:        { label: "Done",        dot: "bg-coverage-full",                text: "text-foreground" },
  ARCHIVED:    { label: "Archived",    dot: "bg-muted-foreground/30",          text: "text-muted-foreground" },
};

const ArtifactsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") as ArtifactType | null;
  const activeTab = searchParams.get("tab") || "artifacts";

  const { currentProjectId, artifactTypeFilter, setArtifactTypeFilter, statusFilter, setStatusFilter } = useUIStore();
  const { data: artifacts, isLoading } = useArtifacts(currentProjectId || undefined);
  const { data: projectEdges } = useProjectArtifactEdges(currentProjectId || undefined);
  const { canCreateArtifact, artifactAtLimit } = useUsageLimits();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [hierarchyMode, setHierarchyMode] = useState(false);
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "title">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [linkTarget, setLinkTarget] = useState<Artifact | null>(null);

  const filteredArtifacts = useMemo(() => {
    return (artifacts || []).filter((artifact) => {
      if (artifact.type === "FILE") return false;
      const matchesSearch =
        search === "" ||
        artifact.title.toLowerCase().includes(search.toLowerCase()) ||
        artifact.short_id.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter
        ? artifact.type === typeFilter
        : artifactTypeFilter.length === 0 || artifactTypeFilter.includes(artifact.type);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(artifact.status);
      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") comparison = a.title.localeCompare(b.title);
      else comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [artifacts, search, typeFilter, artifactTypeFilter, statusFilter, sortBy, sortOrder]);

  // ── Pulse strip: high-signal type breakdown across all artifacts ────────
  const pulse = useMemo(() => {
    const list = (artifacts || []).filter((a) => a.type !== "FILE");
    const count = (t: ArtifactType) => list.filter((a) => a.type === t).length;
    return {
      total: list.length,
      prd: count("PRD"),
      epic: count("EPIC"),
      story: count("STORY"),
      ac: count("ACCEPTANCE_CRITERION"),
      test: count("TEST_CASE") + count("TEST_SUITE"),
      bug: count("BUG"),
      inProgress: list.filter((a) => a.status === "IN_PROGRESS").length,
      blocked: list.filter((a) => a.status === "BLOCKED").length,
      done: list.filter((a) => a.status === "DONE").length,
    };
  }, [artifacts]);

  const heroState = useMemo(() => {
    if (pulse.total === 0) {
      return { pillLabel: "Empty", dotClass: "bg-muted-foreground/40", pulse: false, subline: "No artifacts yet. Start with a PRD or generate stories from an idea." };
    }
    if (pulse.blocked > 0) {
      return { pillLabel: "Blocked", dotClass: "bg-destructive", pulse: true, subline: `${pulse.blocked} blocked, ${pulse.inProgress} in flight across ${pulse.total} artifacts.` };
    }
    if (pulse.inProgress > 0) {
      return { pillLabel: "In flight", dotClass: "bg-coverage-partial", pulse: true, subline: `${pulse.inProgress} in flight, ${pulse.done} done across ${pulse.total} artifacts.` };
    }
    return { pillLabel: "Healthy", dotClass: "bg-accent", pulse: false, subline: `${pulse.total} artifacts. ${pulse.done} done.` };
  }, [pulse]);

  // ── Hierarchy tree ──────────────────────────────────────────────────────
  const treeData = useMemo(() => {
    if (!hierarchyMode || !artifacts || !projectEdges) return null;

    const allArtifacts = artifacts.filter((a) => a.type !== "FILE");
    const filteredIds = new Set(filteredArtifacts.map((a) => a.id));
    const artifactMap = new Map(allArtifacts.map((a) => [a.id, a]));

    // Pick ONE canonical parent per child to avoid duplicates.
    // Priority: parent_artifact_id > CONTAINS edge > DERIVES_FROM edge.
    const parentOf = new Map<string, { parentId: string; priority: number }>();
    const setParent = (childId: string, parentId: string, priority: number) => {
      if (!artifactMap.has(parentId) || !artifactMap.has(childId)) return;
      if (parentId === childId) return;
      const existing = parentOf.get(childId);
      if (!existing || priority < existing.priority) {
        parentOf.set(childId, { parentId, priority });
      }
    };

    for (const a of allArtifacts) {
      if (a.parent_artifact_id) setParent(a.id, a.parent_artifact_id, 0);
    }
    for (const edge of projectEdges) {
      if (edge.edge_type === "CONTAINS") {
        setParent(edge.to_artifact_id, edge.from_artifact_id, 1);
      }
    }
    for (const edge of projectEdges) {
      if (edge.edge_type === "DERIVES_FROM") {
        setParent(edge.to_artifact_id, edge.from_artifact_id, 2);
      }
    }

    const cMap = new Map<string, Artifact[]>();
    const childIds = new Set<string>();
    for (const [childId, { parentId }] of parentOf) {
      const child = artifactMap.get(childId)!;
      childIds.add(childId);
      if (!cMap.has(parentId)) cMap.set(parentId, []);
      cMap.get(parentId)!.push(child);
    }


    const visibleIds = new Set<string>(filteredIds);
    const findAncestors = (id: string) => {
      const p = parentOf.get(id);
      if (p && !visibleIds.has(p.parentId)) {
        visibleIds.add(p.parentId);
        findAncestors(p.parentId);
      }
    };
    filteredIds.forEach((id) => findAncestors(id));


    const roots = allArtifacts.filter((a) => visibleIds.has(a.id) && !childIds.has(a.id));
    const typeOrder: Record<string, number> = { IDEA: 0, PRD: 1, EPIC: 2, STORY: 3 };
    roots.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

    const result: { artifact: Artifact; depth: number; hasChildren: boolean; isMatchedByFilter: boolean }[] = [];
    const flatten = (items: Artifact[], depth: number) => {
      for (const item of items) {
        if (!visibleIds.has(item.id)) continue;
        const children = (cMap.get(item.id) || []).filter((c) => visibleIds.has(c.id));
        children.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));
        const hasChildren = children.length > 0;
        result.push({ artifact: item, depth, hasChildren, isMatchedByFilter: filteredIds.has(item.id) });
        if (hasChildren && expandedNodes.has(item.id)) flatten(children, depth + 1);
      }
    };
    flatten(roots, 0);
    return result;
  }, [hierarchyMode, artifacts, projectEdges, filteredArtifacts, expandedNodes]);

  const toggleExpanded = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!artifacts || !projectEdges) return;
    const allParentIds = new Set<string>();
    projectEdges.forEach((e) => {
      if (e.edge_type === "CONTAINS" || e.edge_type === "DERIVES_FROM") allParentIds.add(e.from_artifact_id);
    });
    artifacts.forEach((a) => { if (a.parent_artifact_id) allParentIds.add(a.parent_artifact_id); });
    setExpandedNodes(allParentIds);
  }, [artifacts, projectEdges]);

  const collapseAll = useCallback(() => setExpandedNodes(new Set()), []);

  const handleCreateArtifact = (type?: ArtifactType) => {
    if (!canCreateArtifact) { setShowLimitDialog(true); return; }
    const params = type ? `?type=${type}` : "";
    navigate(`/artifacts/new${params}`);
  };

  const handleToggleSelect = (artifactId: string) => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(artifactId)) next.delete(artifactId);
      else next.add(artifactId);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedArtifacts(new Set(filteredArtifacts.map((a) => a.id)));
  const handleDeselectAll = () => setSelectedArtifacts(new Set());

  const handleExport = (format: ExportFormat) => {
    const artifactsToExport = filteredArtifacts.filter((a) => selectedArtifacts.has(a.id));
    if (artifactsToExport.length === 0) { toast.error("No artifacts selected for export"); return; }
    downloadExport(artifactsToExport, format, `onetraceai-artifacts-${new Date().toISOString().split("T")[0]}`);
    toast.success(`Exported ${artifactsToExport.length} artifact(s) as ${format.toUpperCase()}`);
  };

  const selectedCount = selectedArtifacts.size;
  const activeFilterCount = artifactTypeFilter.length + statusFilter.length + (typeFilter ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || search !== "";

  return (
    <AuthGuard>
      <AppLayout>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12 space-y-8 sm:space-y-10">
          <UsageLimitBanner showFor={["artifact"]} />

          {/* Hero */}
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
                Artifacts
              </h1>
              <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
                {heroState.subline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="accent">
                    <Plus className="mr-2 h-4 w-4" />
                    New artifact
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleCreateArtifact("PRD")}>
                    <FileText className="w-4 h-4 mr-2" /> PRD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateArtifact("EPIC")}>
                    <GitBranch className="w-4 h-4 mr-2" /> Epic
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateArtifact("STORY")}>
                    <FileText className="w-4 h-4 mr-2" /> Story
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCreateArtifact("IDEA")}>
                    <Lightbulb className="w-4 h-4 mr-2" /> Idea
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateArtifact("BUG")}>
                    <Bug className="w-4 h-4 mr-2" /> Bug
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-6">
            <div className="border-b border-border">
              <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="artifacts"
                  className="relative -mb-px gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <FileText className="h-4 w-4" /> Artifacts
                  <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">{pulse.total}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="hierarchy"
                  className="relative -mb-px gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Layers className="h-4 w-4" /> Hierarchy
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="relative -mb-px gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Paperclip className="h-4 w-4" /> Files
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="artifacts" className="space-y-5 sm:space-y-6 mt-0">
              {/* Pulse strip — type breakdown */}
              <section className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60 md:grid-cols-6">
                <PulseCount label="PRDs"    value={pulse.prd}    onClick={() => setArtifactTypeFilter(["PRD"])}    accent="prd"  active={artifactTypeFilter.length === 1 && artifactTypeFilter[0] === "PRD"} />
                <PulseCount label="Epics"   value={pulse.epic}   onClick={() => setArtifactTypeFilter(["EPIC"])}   accent="epic" active={artifactTypeFilter.length === 1 && artifactTypeFilter[0] === "EPIC"} />
                <PulseCount label="Stories" value={pulse.story}  onClick={() => setArtifactTypeFilter(["STORY"])}  accent="story" active={artifactTypeFilter.length === 1 && artifactTypeFilter[0] === "STORY"} />
                <PulseCount label="ACs"     value={pulse.ac}     onClick={() => setArtifactTypeFilter(["ACCEPTANCE_CRITERION"])} accent="ac" active={artifactTypeFilter.length === 1 && artifactTypeFilter[0] === "ACCEPTANCE_CRITERION"} />
                <PulseCount label="Tests"   value={pulse.test}   onClick={() => setArtifactTypeFilter(["TEST_CASE", "TEST_SUITE"])} accent="test" />
                <PulseCount label="Bugs"    value={pulse.bug}    onClick={() => setArtifactTypeFilter(["BUG"])}    accent="bug"  active={artifactTypeFilter.length === 1 && artifactTypeFilter[0] === "BUG"} />
              </section>

              {/* Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-[13px]"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Type Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 text-[12px]">
                        <Filter className="w-3.5 h-3.5 mr-1.5" />
                        Type
                        {artifactTypeFilter.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{artifactTypeFilter.length}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {Object.entries(artifactTypeConfig).filter(([t]) => t !== "FILE").map(([type, config]) => (
                        <DropdownMenuCheckboxItem
                          key={type}
                          checked={artifactTypeFilter.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) setArtifactTypeFilter([...artifactTypeFilter, type]);
                            else setArtifactTypeFilter(artifactTypeFilter.filter((t) => t !== type));
                          }}
                        >
                          <config.icon className="w-3.5 h-3.5 mr-2" />
                          {config.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {artifactTypeFilter.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setArtifactTypeFilter([])}>Clear types</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Status Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 text-[12px]">
                        <Filter className="w-3.5 h-3.5 mr-1.5" />
                        Status
                        {statusFilter.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{statusFilter.length}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) setStatusFilter([...statusFilter, status]);
                            else setStatusFilter(statusFilter.filter((s) => s !== status));
                          }}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full mr-2", config.dot)} />
                          {config.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {statusFilter.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setStatusFilter([])}>Clear statuses</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 text-[12px]">
                        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("desc"); }}>Newest first</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("created_at"); setSortOrder("asc"); }}>Oldest first</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("updated_at"); setSortOrder("desc"); }}>Recently updated</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("title"); setSortOrder("asc"); }}>Title A–Z</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-[12px] text-muted-foreground"
                      onClick={() => {
                        setArtifactTypeFilter([]);
                        setStatusFilter([]);
                        setSearch("");
                        if (typeFilter) setSearchParams({ tab: activeTab });
                      }}
                    >
                      Clear
                    </Button>
                  )}

                  {/* Hierarchy toggle */}
                  {viewMode === "list" && (
                    <Button
                      variant={hierarchyMode ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setHierarchyMode(!hierarchyMode)}
                      className="h-9 text-[12px]"
                    >
                      <Network className="w-3.5 h-3.5 mr-1.5" />
                      Tree
                    </Button>
                  )}

                  {/* View toggle */}
                  <div className="flex border border-border rounded-md overflow-hidden h-9">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "px-2.5 flex items-center justify-center transition-colors",
                        viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                      )}
                      aria-label="List view"
                    >
                      <ListIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "px-2.5 flex items-center justify-center border-l border-border transition-colors",
                        viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                      )}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hierarchy sub-controls */}
              {hierarchyMode && viewMode === "list" && (
                <div className="flex items-center gap-1 -mt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={expandAll}>Expand all</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={collapseAll}>Collapse all</Button>
                  <span className="text-[11px] text-muted-foreground/70 ml-2">Parent → child relationships</span>
                </div>
              )}

              {/* Selection bar */}
              {selectedCount > 0 && (
                <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium">{selectedCount} selected</span>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={handleSelectAll}>
                      Select all ({filteredArtifacts.length})
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={handleDeselectAll}>
                      <X className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[12px]">
                        <Download className="w-3 h-3 mr-1.5" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("json")}>Export as JSON</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("markdown")}>Export as Markdown</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("pdf")}>Export as PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredArtifacts.length === 0 ? (
                <div className="border border-border rounded-xl bg-card flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <Boxes className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h2 className="text-[15px] font-semibold text-foreground mb-1">
                    {hasActiveFilters ? "No matches" : "No artifacts yet"}
                  </h2>
                  <p className="text-[13px] text-muted-foreground text-center max-w-sm mb-5">
                    {hasActiveFilters
                      ? "Try adjusting filters or search to broaden your results."
                      : "Start with a PRD or generate stories from an idea."}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => {
                      setArtifactTypeFilter([]); setStatusFilter([]); setSearch("");
                      if (typeFilter) setSearchParams({ tab: activeTab });
                    }}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" className="h-8 text-[12px]" onClick={() => handleCreateArtifact()}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Create artifact
                    </Button>
                  )}
                </div>
              ) : viewMode === "list" ? (
                <section className="border border-border rounded-xl bg-card overflow-hidden">
                  {/* List header */}
                  <div className="hidden md:grid grid-cols-[32px_80px_88px_1fr_120px_120px_36px] gap-3 items-center px-4 py-2.5 border-b border-border bg-muted/30">
                    <Checkbox
                      checked={filteredArtifacts.length > 0 && filteredArtifacts.every((a) => selectedArtifacts.has(a.id))}
                      onCheckedChange={(checked) => (checked ? handleSelectAll() : handleDeselectAll())}
                    />
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">ID</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Type</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Title</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Status</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Updated</span>
                    <span />
                  </div>

                  <ul className="divide-y divide-border">
                    {(hierarchyMode && treeData
                      ? treeData
                      : filteredArtifacts.map((a) => ({ artifact: a, depth: 0, hasChildren: false, isMatchedByFilter: true }))
                    ).map((item) => {
                      const { artifact, depth, hasChildren, isMatchedByFilter } = item;
                      const typeMeta = artifactTypeConfig[artifact.type as ArtifactType];
                      const status = statusConfig[artifact.status as ArtifactStatus];
                      const isExpanded = expandedNodes.has(artifact.id);
                      const isSelected = selectedArtifacts.has(artifact.id);

                      return (
                        <li key={artifact.id}>
                          <div
                            onClick={() => navigate(`/artifacts/${artifact.id}`)}
                            className={cn(
                              "grid grid-cols-[32px_1fr_36px] md:grid-cols-[32px_80px_88px_1fr_120px_120px_36px] gap-3 items-center px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors group",
                              isSelected && "bg-accent/5",
                              hierarchyMode && !isMatchedByFilter && "opacity-50"
                            )}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSelect(artifact.id)} />
                            </div>
                            <span className="hidden md:inline font-mono text-[11px] text-muted-foreground truncate">
                              {artifact.short_id}
                            </span>
                            <div className="hidden md:flex">
                              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", typeMeta?.chip)}>
                                {typeMeta?.icon && <typeMeta.icon className="w-3 h-3" />}
                                {typeMeta?.label || artifact.type}
                              </span>
                            </div>
                            <div className="flex items-center min-w-0" style={{ paddingLeft: hierarchyMode ? `${depth * 18}px` : 0 }}>
                              {hierarchyMode && (
                                <span
                                  className="inline-flex items-center justify-center w-4 h-4 mr-1 shrink-0"
                                  onClick={(e) => (hasChildren ? toggleExpanded(artifact.id, e) : e.stopPropagation())}
                                >
                                  {hasChildren ? (
                                    isExpanded
                                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                  ) : <span className="w-3.5 h-3.5" />}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-foreground truncate">{artifact.title}</p>
                                <div className="md:hidden flex items-center gap-2 mt-0.5">
                                  <span className={cn("inline-flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium border", typeMeta?.chip)}>
                                    {typeMeta?.label || artifact.type}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">{artifact.short_id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="hidden md:flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", status?.dot)} />
                              <span className={cn("text-[12px]", status?.text)}>{status?.label || artifact.status}</span>
                            </div>
                            <span className="hidden md:inline text-[11px] text-muted-foreground tabular-nums">
                              {new Date(artifact.updated_at).toLocaleDateString()}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/artifacts/${artifact.id}`); }}>
                                  <ArrowUpRight className="w-3.5 h-3.5 mr-2" /> View details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/artifacts/${artifact.id}/edit`); }}>
                                  Edit
                                </DropdownMenuItem>
                                {linkRules[artifact.type as ArtifactType] && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLinkTarget(artifact); }}>
                                    <Link2 className="w-3.5 h-3.5 mr-2" /> Link to parent…
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/graph?focus=${artifact.id}`); }}>
                                  <Network className="w-3.5 h-3.5 mr-2" /> View in graph
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredArtifacts.map((artifact) => {
                    const typeMeta = artifactTypeConfig[artifact.type as ArtifactType];
                    const status = statusConfig[artifact.status as ArtifactStatus];
                    const isSelected = selectedArtifacts.has(artifact.id);
                    return (
                      <div
                        key={artifact.id}
                        onClick={() => navigate(`/artifacts/${artifact.id}`)}
                        className={cn(
                          "relative border border-border rounded-xl bg-card p-4 cursor-pointer hover:border-foreground/20 hover:bg-muted/30 transition-colors group",
                          isSelected && "ring-1 ring-accent border-accent/40"
                        )}
                      >
                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSelect(artifact.id)} />
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", typeMeta?.chip)}>
                            {typeMeta?.icon && <typeMeta.icon className="w-3 h-3" />}
                            {typeMeta?.label || artifact.type}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{artifact.short_id}</span>
                        </div>
                        <h3 className="text-[13px] font-medium text-foreground line-clamp-2 mb-3 min-h-[2.4em]">
                          {artifact.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full", status?.dot)} />
                            <span className={cn("text-[11px]", status?.text)}>{status?.label || artifact.status}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(artifact.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hierarchy" className="space-y-6 mt-0">
              <EpicHierarchyView projectId={currentProjectId || undefined} />
            </TabsContent>

            <TabsContent value="files" className="space-y-6 mt-0">
              <FilesSection />
            </TabsContent>
          </Tabs>
        </div>

        <UsageLimitDialog
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          type="artifact"
          isAtLimit={artifactAtLimit}
        />

        {linkTarget && (
          <LinkArtifactDialog
            open={!!linkTarget}
            onOpenChange={(open) => { if (!open) setLinkTarget(null); }}
            artifact={linkTarget}
          />
        )}
      </AppLayout>
    </AuthGuard>
  );
};

// ─── Subcomponents ──────────────────────────────────────────────────────────

function PulseCount({
  label,
  value,
  onClick,
  accent,
  active,
}: {
  label: string;
  value: number;
  onClick: () => void;
  accent: "prd" | "epic" | "story" | "ac" | "test" | "bug";
  active?: boolean;
}) {
  const dotClass = {
    prd: "bg-status-prd",
    epic: "bg-status-epic",
    story: "bg-status-story",
    ac: "bg-status-ac",
    test: "bg-status-test",
    bug: "bg-destructive",
  }[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start gap-1 bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50",
        active && "bg-muted/70"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            value > 0 ? dotClass : "bg-muted-foreground/30"
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-display text-2xl font-semibold tabular-nums",
          value > 0 ? "text-foreground" : "text-muted-foreground/40"
        )}
      >
        {value}
      </span>
    </button>
  );
}


export default ArtifactsPage;
