import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectDetailQuery, reanalyzeProjectMutation, updateElementMutation } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { 
  IconSettings, 
  IconExternalLink, 
  IconRefresh, 
  IconTypography, 
  IconPhoto, 
  IconLink, 
  IconCalendar,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconBrandGithub,
  IconGitBranch,
  IconInfoCircle,
  IconSearch
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Item, ItemGroup, ItemContent, ItemMedia, ItemActions } from "@/components/ui/item";
import { ElementEditor } from "@/components/editor/ElementEditor";
import { cn } from "@/lib/utils";

export function ProjectDetailPage() {
  const { projectId } = useParams({ from: "/dashboard/projects/$projectId" });
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const { data: projectData, isLoading: isProjectLoading } = useQuery(projectDetailQuery(projectId));
  const { data: sectionsData, isLoading: isSectionsLoading } = useQuery({
    queryKey: ["project", projectId, "sections"],
    queryFn: async () => {
      const response = await apiFetch<{ sections: any[] }>(`/projects/${projectId}/sections`);
      return response.sections;
    }
  });

  const project = projectData?.project;
  const sections = sectionsData || [];

  const reanalyze = useMutation({
    ...reanalyzeProjectMutation(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Analysis started!");
    },
  });

  const toggleVisibility = useMutation({
    ...updateElementMutation(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "sections"] });
    },
  });

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const isLoading = isProjectLoading || isSectionsLoading;

  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return <div>Project not found</div>;

  const filteredSections = sections.map(section => ({
    ...section,
    elements: (section.elements || []).filter((el: any) => 
      (el.currentValue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (el.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.elements.length > 0);

  const totalElements = sections.reduce((acc, s) => acc + (s.elements?.length || 0), 0);
  const visibleElements = sections.reduce((acc, s) => acc + (s.elements?.filter((e: any) => e.isVisible)?.length || 0), 0);

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
              <Badge variant="success" className="px-3 py-1 font-bold">Active</Badge>
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
                       Last synced: <span className="font-bold text-foreground">Oct 24, 2024</span>
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
            <Button variant="outline" size="sm" onClick={() => reanalyze.mutate()} disabled={reanalyze.isPending}>
              <IconRefresh className={cn("w-4 h-4 mr-2", reanalyze.isPending && "animate-spin")} />
              {reanalyze.isPending ? "Analyzing..." : "Re-analyze"}
            </Button>
            <Button size="sm" className="group shadow-lg shadow-primary/20">
              <IconExternalLink className="w-4 h-4 mr-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              View Site
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full">
              <IconSettings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {reanalyze.isPending && (
        <Card className="bg-primary/5 border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-primary flex items-center gap-2">
                  <IconRefresh className="w-4 h-4 animate-spin" />
                  Analyzing repository structure...
                </span>
                <span className="text-primary">45%</span>
              </div>
              <Progress value={45} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sections", value: sections.length },
          { label: "Total Elements", value: totalElements },
          { label: "Visible", value: visibleElements },
          { label: "Last Analysis", value: "Oct 24, '24", icon: IconCalendar },
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

      {/* Content Area */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
            <Input 
              placeholder="Search in content..." 
              className="pl-11 h-12 bg-muted/20 border-border/50 text-base focus-visible:ring-primary/20 rounded-2xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredSections.map((section: any) => {
            const isOpen = openSections[section.name] !== false;
            return (
              <Collapsible
                key={section.name}
                open={isOpen}
                onOpenChange={() => toggleSection(section.name)}
                className="group border border-border/60 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm"
              >
                <CollapsibleTrigger 
                  render={<button className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-accent/5 transition-all bg-transparent border-none text-inherit text-left focus:outline-none" />}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                      isOpen ? "bg-primary text-primary-foreground rotate-90" : "bg-muted text-muted-foreground"
                    )}>
                      <IconChevronDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{section.name}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{(section.elements || []).length} components</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-bold opacity-60 px-3 uppercase text-[10px] tracking-widest">Section</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-collapsible-down">
                  <div className="border-t border-border/50">
                    <ItemGroup className="gap-0">
                      {section.elements.map((element: any) => (
                        <Item 
                          key={element.id} 
                          className={cn(
                            "px-8 py-6 border-b border-border/40 last:border-0 rounded-none items-start gap-8 hover:bg-muted/10 transition-all group/item",
                            !element.isVisible && "opacity-40 grayscale-[0.8]"
                          )}
                        >
                          <ItemMedia variant="icon" className="w-12 h-12 border-2 bg-background shrink-0 mt-1 rounded-xl shadow-inner group-hover/item:border-primary/30 group-hover/item:scale-105 transition-all">
                            {element.type === "text" ? <IconTypography className="w-5 h-5" /> :
                             element.type === "image" ? <IconPhoto className="w-5 h-5" /> :
                             <IconLink className="w-5 h-5" />}
                          </ItemMedia>
                          
                          <ItemContent className="min-w-0">
                            <div className="flex items-center gap-3 mb-2.5">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">{element.key}</span>
                              {element.type === "image" && <Badge variant="outline" className="text-[8px] h-4 py-0 font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">Image</Badge>}
                            </div>
                            
                            <div className="relative">
                              <p className="text-sm font-medium text-foreground line-clamp-4 leading-relaxed tracking-tight">
                                {element.content || <span className="text-muted-foreground/50 italic font-normal">No content discovered</span>}
                              </p>
                              {element.alt && (
                                <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/30 flex items-start gap-3">
                                  <IconInfoCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <p className="text-[11px] font-medium text-muted-foreground leading-normal">
                                    <span className="text-foreground/70 font-bold uppercase text-[9px] mr-1">Alt Text:</span> 
                                    {element.alt}
                                  </p>
                                </div>
                              )}
                            </div>
                          </ItemContent>

                          <ItemActions className="ml-auto">
                            <div className="flex items-center gap-6 pr-2">
                              <HoverCard>
                                <HoverCardTrigger 
                                  render={<button className="flex flex-col items-center gap-2 mr-2 cursor-help group/switch bg-transparent border-none p-0 text-inherit focus:outline-none" />}
                                >
                                    <span className={cn(
                                      "text-[9px] font-black uppercase tracking-widest transition-colors",
                                      element.isVisible ? "text-emerald-500" : "text-muted-foreground"
                                    )}>
                                      {element.isVisible ? "Visible" : "Hidden"}
                                    </span>
                                    <Switch 
                                      checked={element.isVisible} 
                                      size="sm"
                                      onCheckedChange={(checked) => toggleVisibility.mutate({ elementId: element.id, isVisible: checked })}
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64 text-[11px] p-4 bg-popover/90 backdrop-blur-md">
                                  <p className="font-bold mb-1 uppercase tracking-tighter">Visibility Toggle</p>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {element.isVisible 
                                      ? "This element is currently synced with your codebase and visible in the CMS." 
                                      : "This element is hidden from the CMS but still exists in your source code."}
                                  </p>
                                </HoverCardContent>
                              </HoverCard>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingElementId(element.id)}
                                className="h-10 px-4 rounded-xl border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all group/edit"
                              >
                                <IconEdit className="w-4 h-4 mr-2 group-hover/edit:rotate-12 transition-transform" />
                                <span className="font-bold text-[10px] uppercase tracking-widest">Edit</span>
                              </Button>
                            </div>
                          </ItemActions>
                        </Item>
                      ))}
                    </ItemGroup>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

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
