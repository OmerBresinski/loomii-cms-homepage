import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectDetailQuery, analysisStatusQuery } from "@/lib/queries";
import { useTriggerAnalysis } from "@/lib/mutations";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { 
  IconSettings, 
  IconExternalLink, 
  IconRefresh, 
  IconCalendar,
  IconChevronRight,

  IconBrandGithub,
  IconGitBranch,
  IconSearch,
  IconLoader2
} from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { Skeleton } from "@/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/ui/hover-card";
import { ElementEditor } from "@/components/editor/ElementEditor";
import { cn } from "@/lib/utils";
import { Accordion } from "@/ui/accordion";
import { SectionRow } from "./components/SectionRow";

import { ProjectProvider, useProjectContext } from "./context/ProjectContext";

export function ProjectDetailPage() {
  return (
    <ProjectProvider>
      <ProjectDetailContent />
    </ProjectProvider>
  );
}

function ProjectDetailContent() {
  const { projectId } = useParams({ from: "/dashboard/projects/$projectId" });
  const { isDirty, clearDirtyStates } = useProjectContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  // Data Queries
  const { data: projectData, isLoading: isProjectLoading } = useQuery(projectDetailQuery(projectId));
  const { data: analysisStatus } = useQuery(analysisStatusQuery(projectId));
  
  // Conditionally fetch sections only when ready
  const isReady = projectData?.project?.status === "ready" || analysisStatus?.projectStatus === "ready";
  const { data: sectionsData } = useQuery({
    queryKey: ["project", projectId, "sections"],
    queryFn: async () => {
      const response = await apiFetch<{ sections: any[] }>(`/projects/${projectId}/sections`);
      return response.sections;
    },
    enabled: isReady
  });

  const project = projectData?.project;
  const sections = sectionsData || [];

  // Mutations
  const triggerAnalysis = useTriggerAnalysis(projectId);

  // Derived State
  const isAnalyzing = analysisStatus?.projectStatus === "analyzing" || triggerAnalysis.isPending;
  const analysisProgress = analysisStatus?.currentJob?.progress || 0;
  
  const handleAnalysis = () => {
    triggerAnalysis.mutate({}, {
      onSuccess: () => {
        toast.success("Analysis started");
      },
      onError: (err) => {
        toast.error("Failed to start analysis: " + err.message);
      }
    });
  };

  const handlePublish = () => {
    console.log("Publishing...");
    toast.success("Project publishing...");
    // Clear dirty states locally for now as it's a demo
    clearDirtyStates();
  };

  const isLoading = isProjectLoading;

  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return <div>Project not found</div>;

  const filteredSections = sections.filter((section: any) => 
    section.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalElements = sections.reduce((acc: number, s: any) => acc + (s.elementCount || 0), 0);
  const visibleElements = "-"; 

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard/projects" className="hover:text-primary transition-colors">Projects</Link>
          <IconChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{project.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tight leading-none">{project.name}</h1>
              <Badge variant={isAnalyzing ? "outline" : "success"} className="px-3 py-1 font-bold">
                {isAnalyzing ? "Analyzing..." : "Active"}
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
                        <div className="text-xs font-bold uppercase tracking-widest text-primary">Connected Repository</div>
                        <div className="text-sm font-bold truncate">{project.githubRepo}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconGitBranch className="w-3 h-3" />
                      Branch: <span className="font-bold text-foreground">{project.githubBranch}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                       <IconCalendar className="w-3 h-3" />
                       Last synced: <span className="font-bold text-foreground">
                         {analysisStatus?.lastAnalyzedAt 
                           ? new Date(analysisStatus.lastAnalyzedAt).toLocaleDateString()
                           : "Never"}
                       </span>
                    </div>
                     <div className="pt-2">
                        <Button
                          // @ts-ignore - nativeButton is missing from types but required by Base UI
                          nativeButton={false}
                          size="sm" variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest h-8" render={<a href={`https://github.com/${project.githubRepo}`} target="_blank" rel="noreferrer" />}>
                          View on GitHub
                        </Button>
                     </div>
                  </div>
                </HoverCardContent>
              </HoverCard>

              <div className="flex items-center gap-2">
                 <IconGitBranch className="w-4 h-4" />
                 <span className="font-mono text-xs">{project.githubBranch}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAnalysis} 
              disabled={isAnalyzing}
              className={cn(isAnalyzing ? "opacity-100" : "")}
            >
              <IconRefresh className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")} />
              {isAnalyzing ? "Analyzing..." : "Begin Analysis"}
            </Button>

            <Button size="sm" variant="secondary" className="group shadow-md">
              <IconExternalLink className="w-4 h-4 mr-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              View Site
            </Button>
            
            <Button 
              size="sm" 
              className={cn(
                "font-bold uppercase tracking-widest px-6 transition-all",
                isDirty 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95" 
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              )}
              onClick={handlePublish}
              disabled={!isDirty}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <Card className="bg-primary/5 border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-primary flex items-center gap-2">
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                  Analyzing repository structure...
                </span>
                <span className="text-primary">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isReady && sections.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {[
            { label: "Sections", value: sections.length },
            { label: "Total Elements", value: totalElements },
            { label: "Visible", value: visibleElements },
            { 
              label: "Last Analysis", 
              value: analysisStatus?.lastAnalyzedAt 
                ? new Date(analysisStatus.lastAnalyzedAt).toLocaleDateString() 
                : "-", 
              icon: IconCalendar 
            },
          ].map((stat) => (
            <Card key={stat.label} className="bg-muted/20 border-border/50 shadow-none hover:bg-muted/30 transition-colors">
              <CardContent className="p-6">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black">{stat.value}</p>
                  {stat.icon && <stat.icon className="w-4 h-4 text-muted-foreground opacity-20" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Content Area */}
      {isReady ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search sections..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/50">
              <div className="bg-muted/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IconSearch className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No sections found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                We couldn't find any sections matching your search terms.
              </p>
            </div>
          ) : (
            <Accordion className="w-full border-none space-y-4">
              {filteredSections.map((section: any) => (
                <SectionRow 
                  key={section.id} 
                  section={section} 
                  projectId={projectId}
                  searchTerm={searchTerm}
                />
              ))}
            </Accordion>
          )}
        </div>
      ) : (
        !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
             <div className="bg-primary/5 p-6 rounded-full mb-6">
                <IconRefresh className="w-12 h-12 text-primary opacity-50" />
             </div>
             <h2 className="text-2xl font-bold mb-2">No Analysis Data</h2>
             <p className="text-muted-foreground max-w-md mb-8">
               Run the analysis to discover editable sections and components in your codebase.
             </p>
             <Button size="lg" onClick={handleAnalysis}>
                <IconRefresh className="w-4 h-4 mr-2" />
                Start Analysis
             </Button>
          </div>
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
  );
}




function ProjectDetailSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
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
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </div>
      <div className="space-y-4 pt-10">
        <Skeleton className="h-14 w-full rounded-2xl" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}
