import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery } from "@/lib/queries";
import { useOrganization } from "@clerk/clerk-react";
import { IconPlus, IconFolder, IconSearch, IconFilter, IconExternalLink, IconBrandGithub } from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions } from "@/ui/item";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/ui/empty";

export function ProjectsPage() {
  const { organization } = useOrganization();
  const { data: projectsData, isLoading } = useQuery(projectListQuery());
  const projects = projectsData?.projects ?? [];

  if (!organization) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and edit your repository content.</p>
        </div>
        <Button render={<Link to="/dashboard/projects/new" />} nativeButton={false}>
          <IconPlus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <IconFilter className="w-4 h-4" />
        </Button>
      </div>

      <Card className="min-h-[400px]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <Empty className="border-none max-w-md">
                <EmptyMedia>
                  <IconFolder className="w-12 h-12 text-muted-foreground opacity-20" />
                </EmptyMedia>
                <EmptyTitle className="text-xl">No projects found</EmptyTitle>
                <EmptyDescription className="text-base">
                  You haven't created any projects yet. Connect a repository to get started.
                </EmptyDescription>
                <Button size="lg" className="mt-6" render={<Link to="/dashboard/projects/new" />} nativeButton={false}>
                  Create your first project
                </Button>
              </Empty>
            </div>
          ) : (
            <ItemGroup className="gap-0">
              {projects.map((project) => (
                <Item key={project.id} variant="default" className="px-8 py-6 border-b last:border-0 rounded-none hover:bg-accent/30 group">
                  <ItemMedia variant="icon" className="w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3">
                    <IconFolder className="w-6 h-6" />
                  </ItemMedia>
                  <ItemContent className="ml-6 gap-2">
                    <ItemTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {project.name}
                    </ItemTitle>
                    <div className="flex items-center gap-3">
                      <ItemDescription className="flex items-center gap-1.5">
                        <IconBrandGithub className="w-3.5 h-3.5" />
                        {project.githubRepo}
                      </ItemDescription>
                      <span className="text-border">|</span>
                      <ItemDescription>
                        {project.githubBranch}
                      </ItemDescription>
                      {project.rootPath && project.rootPath !== "/" && (
                        <>
                          <span className="text-border">|</span>
                          <ItemDescription>
                            {project.rootPath}
                          </ItemDescription>
                        </>
                      )}
                    </div>
                  </ItemContent>
                  <ItemActions className="gap-4">
                    <div className="flex flex-col items-end gap-1.5 mr-4 hidden sm:flex">
                      <Badge variant="success" className="h-5">Active</Badge>
                      <span className="text-[10px] text-muted-foreground italic">Last analyzed 2 days ago</span>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex" render={<Link to="/dashboard/projects/$projectId" params={{ projectId: project.id }} />} nativeButton={false}>
                      Manage
                    </Button>
                    <Button variant="ghost" size="icon" render={<Link to="/dashboard/projects/$projectId" params={{ projectId: project.id }} />} nativeButton={false}>
                      <IconExternalLink className="w-4 h-4" />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
