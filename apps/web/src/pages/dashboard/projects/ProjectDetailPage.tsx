import { useState } from "react";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectDetailQuery, analysisStatusQuery, projectPagesQuery, sectionListQuery, queryKeys } from "@/lib/queries";
import { useTriggerAnalysis, useCancelAnalysis } from "@/lib/mutations";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  IconExternalLink,
  IconRefresh,
  IconCalendar,
  IconChevronRight,
  IconBrandGithub,
  IconGitBranch,
  IconSearch,
  IconLoader2,
} from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/ui/input-group";
import { Item, ItemContent, ItemTitle, ItemDescription } from "@/ui/item";
import { Separator } from "@/ui/separator";
import { Progress } from "@/ui/progress";
import { Skeleton } from "@/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/ui/empty";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/ui/hover-card";
import { ElementEditor } from "@/components/editor/ElementEditor";
import { cn } from "@/lib/utils";
import { Accordion } from "@/ui/accordion";
import { SectionRow } from "./components/SectionRow";

import { useProjectContext } from "./context/ProjectContext";

export function ProjectDetailPage() {
  const { projectId } = useParams({ from: "/dashboard/projects/$projectId/" });
  const { isDirty, editCount, pendingEdits, clearAllEdits } = useProjectContext();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  // Data Queries
  const { data: projectData, isLoading: isProjectLoading } = useQuery(
    projectDetailQuery(projectId)
  );
  const { data: analysisStatus } = useQuery(analysisStatusQuery(projectId));

  // Conditionally fetch sections and pages only when ready
  const isReady =
    projectData?.project?.status === "ready" ||
    analysisStatus?.projectStatus === "ready";

  const { data: pagesData } = useQuery({
    ...projectPagesQuery(projectId),
    enabled: isReady,
  });

  const { data: sectionsData } = useQuery({
    ...sectionListQuery(projectId),
    enabled: isReady,
  });

  const pages = pagesData?.pages || [];

  // Use first page as default if none selected
  const effectiveSelectedPage = selectedPage ?? pages[0]?.pageRoute ?? null;

  const project = projectData?.project;
  const sections = sectionsData?.sections || [];

  // Mutations
  const triggerAnalysis = useTriggerAnalysis(projectId);
  const cancelAnalysis = useCancelAnalysis(projectId);

  const analysisProgress = analysisStatus?.currentJob?.progress || 0;
  const queryClient = useQueryClient();

  // Track if we started analyzing to show toast on completion
  const [wasAnalyzingState, setWasAnalyzingState] = useState(false);
  // Track local "forcing" state to prevent flicker during mutation -> status query race
  const [localAnalyzing, setLocalAnalyzing] = useState(false);

  // Effective analyzing state: either API says so, mutation pending, or local override
  const isAnalyzingEffective =
    analysisStatus?.projectStatus === "analyzing" ||
    triggerAnalysis.isPending ||
    localAnalyzing;

  // Update wasAnalyzingState when starting analysis
  if (isAnalyzingEffective && !wasAnalyzingState) {
    setWasAnalyzingState(true);
  }

  // Clear local analyzing state once API confirms we're analyzing
  if (localAnalyzing && analysisStatus?.projectStatus === "analyzing") {
    setLocalAnalyzing(false);
  }

  // When analysis completes, refetch sections and show toast
  if (
    wasAnalyzingState &&
    !isAnalyzingEffective &&
    analysisStatus?.projectStatus === "ready"
  ) {
    setWasAnalyzingState(false);
    queryClient.invalidateQueries({
      queryKey: queryKeys.sectionList(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.projectDetail(projectId), "pages"],
    });
    toast.success("Analysis complete!");
  }

  const handleAnalysis = () => {
    // Set local analyzing state immediately to prevent flicker
    setLocalAnalyzing(true);
    triggerAnalysis.mutate(
      {},
      {
        onSuccess: () => {
          toast.success("Analysis started");
        },
        onError: (err) => {
          setLocalAnalyzing(false);
          toast.error("Failed to start analysis: " + err.message);
        },
      }
    );
  };

  const handlePublish = () => {
    // Navigate to the review page
    navigate({ to: `/dashboard/projects/${projectId}/review` });
  };

  const isLoading = isProjectLoading;

  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return <div>Project not found</div>;

  const filteredSections = sections.filter((section: any) => {
    // Filter by search term
    if (!section.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Filter by selected page - only show sections that have elements on this page
    if (effectiveSelectedPage && section.pages) {
      return section.pages.includes(effectiveSelectedPage);
    }
    return true;
  });

  // Calculate stats based on selected page
  const selectedPageData = effectiveSelectedPage
    ? pages.find((p) => p.pageRoute === effectiveSelectedPage)
    : null;
  const totalElements = selectedPageData?.elementCount
    ?? sections.reduce((acc: number, s: any) => acc + (s.elementCount || 0), 0);

  return (
    <div className="flex">
      {/* Left Sidebar - Pages (attached to app sidebar) */}
      {isReady && !isAnalyzingEffective && pages.length > 0 && (
        <div className="w-44 border-r border-border/50 p-3 shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Pages
            </h3>
            <div className="space-y-0.5">
              {pages.map((page) => (
                <button
                  key={page.pageRoute}
                  onClick={() => setSelectedPage(page.pageRoute)}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-xs transition-colors",
                    effectiveSelectedPage === page.pageRoute
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {page.pageName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/dashboard/projects"
            className="hover:text-primary transition-colors"
          >
            Projects
          </Link>
          <IconChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{project.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-serif font-bold tracking-tight leading-none text-title">
                {project.name}
              </h1>
              <Badge
                variant={isAnalyzingEffective ? "outline" : "success"}
                className="px-3 py-1 font-bold"
              >
                {isAnalyzingEffective ? "Analyzing..." : "Active"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground">
              <HoverCard>
                <HoverCardTrigger
                  render={
                    <button className="flex items-center gap-2 cursor-help group bg-transparent border-none p-0 text-inherit focus:outline-none" />
                  }
                >
                  <IconBrandGithub className="w-4 h-4 group-hover:text-primary transition-colors" />
                  <span className="font-medium text-sm border-b border-dotted border-muted-foreground/30 group-hover:border-primary/50 group-hover:text-foreground transition-all">
                    {project.githubRepo}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-0 overflow-hidden border-border/50 shadow-2xl">
                  <div className="bg-primary/5 p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center">
                        <IconBrandGithub className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-widest text-primary">
                          Connected Repository
                        </div>
                        <div className="text-sm font-bold truncate">
                          {project.githubRepo}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconGitBranch className="w-3 h-3" />
                      Branch:{" "}
                      <span className="font-bold text-foreground">
                        {project.githubBranch}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconCalendar className="w-3 h-3" />
                      Last synced:{" "}
                      <span className="font-bold text-foreground">
                        {analysisStatus?.lastAnalyzedAt
                          ? new Date(
                              analysisStatus.lastAnalyzedAt
                            ).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                    <div className="pt-2">
                      <Button
                        // @ts-ignore - nativeButton is missing from types but required by Base UI
                        nativeButton={false}
                        size="sm"
                        variant="outline"
                        className="w-full text-[10px] font-bold uppercase tracking-widest h-8"
                        render={
                          <a
                            href={`https://github.com/${project.githubRepo}`}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        View on GitHub
                      </Button>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>

              <div className="flex items-center gap-2">
                <IconGitBranch className="w-4 h-4" />
                <span className="font-mono text-xs">
                  {project.githubBranch}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalysis}
              disabled={isAnalyzingEffective}
              className={cn(isAnalyzingEffective ? "opacity-100" : "")}
            >
              <IconRefresh
                className={cn("w-4 h-4 mr-2", isAnalyzingEffective && "animate-spin")}
              />
              {isAnalyzingEffective ? "Analyzing..." : "Begin Analysis"}
            </Button>

            <Button size="sm" variant="secondary" className="group shadow-md">
              <IconExternalLink className="w-4 h-4 mr-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              View Site
            </Button>

            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!isDirty}
            >
              Review Changes
              {editCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 px-1.5">
                  {editCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {isAnalyzingEffective && (
        <Card className="bg-primary/5 border-primary/20 overflow-hidden">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-primary flex items-center gap-2">
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  Analyzing repository structure...
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-primary">{analysisProgress}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      cancelAnalysis.mutate(undefined, {
                        onSuccess: () => {
                          toast.success("Analysis cancelled");
                          setWasAnalyzingState(false);
                        },
                        onError: (err) =>
                          toast.error("Failed to cancel: " + err.message),
                      });
                    }}
                    disabled={cancelAnalysis.isPending}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <Progress value={analysisProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats - hide during analysis */}
      {isReady &&
        !isAnalyzingEffective &&
        filteredSections.length > 0 &&
        (() => {
          const stats = [
            {
              label: "Page",
              value: selectedPageData?.pageName || effectiveSelectedPage || "-",
            },
            { label: "Elements", value: totalElements },
            { label: "Sections", value: filteredSections.length },
            {
              label: "Last Analysis",
              value: analysisStatus?.lastAnalyzedAt
                ? new Date(analysisStatus.lastAnalyzedAt).toLocaleDateString()
                : "-",
            },
          ];
          return (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center h-18">
                  {stats.map((stat, index) => (
                    <div key={stat.label} className="contents">
                      <Item
                        className="border-none rounded-none px-6 py-4 flex-1"
                      >
                        <ItemContent>
                          <ItemDescription>{stat.label}</ItemDescription>
                          <ItemTitle className="text-xl font-semibold">
                            {stat.value}
                          </ItemTitle>
                        </ItemContent>
                      </Item>
                      {index < stats.length - 1 && (
                        <Separator
                          orientation="vertical"
                          className="!self-center h-[60%]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Content Area - hide during analysis */}
      {isReady && !isAnalyzingEffective ? (
        <div className="space-y-6">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <InputGroupText>
                <IconSearch className="w-4 h-4" />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {filteredSections.length === 0 ? (
            <Empty className="py-12 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconSearch className="w-4 h-4" />
                </EmptyMedia>
                <EmptyTitle>No sections found</EmptyTitle>
                <EmptyDescription>
                  We couldn't find any sections matching your search terms.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Accordion>
              {filteredSections.map((section: any) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  projectId={projectId}
                  searchTerm={searchTerm}
                  selectedPage={effectiveSelectedPage}
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : (
        !isAnalyzingEffective && (
          <Empty className="py-16 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconRefresh className="w-4 h-4" />
              </EmptyMedia>
              <EmptyTitle>No Analysis Data</EmptyTitle>
              <EmptyDescription>
                Run the analysis to discover editable sections and components in
                your codebase.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={handleAnalysis}>
              <IconRefresh className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </Empty>
        )
      )}

      {editingElementId && (
        <ElementEditor
          projectId={projectId}
          elementId={editingElementId}
          onClose={() => setEditingElementId(null)}
        />
      )}
      </div>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <Skeleton className="h-12 w-80 rounded-lg" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="space-y-4 pt-10">
        <Skeleton className="h-14 w-full rounded-2xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
