import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery, currentOrgQuery } from "@/lib/queries";
import { useOrganization } from "@clerk/clerk-react";
import { IconPlus, IconBrandGithub, IconFolder, IconArrowRight, IconBolt, IconHistory, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions } from "@/components/ui/item";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export function DashboardHome() {
  const { organization } = useOrganization();
  const { data: projectsData, isLoading } = useQuery(projectListQuery());
  const projects = projectsData?.projects ?? [];
  const { data: orgData } = useQuery(currentOrgQuery());

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  if (!organization) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">Here's an overview of your projects and latest activity.</p>
      </div>

      {!hasGitHub && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <IconBrandGithub className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-500">Connect GitHub</h3>
                <p className="text-sm text-amber-500/80 mb-4 max-w-lg">
                  Loomii needs access to your GitHub repositories to analyze and manage your project content.
                </p>
                <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 text-amber-500" render={<Link to="/dashboard/settings" search={{ github: undefined, error: undefined }} />} nativeButton={false}>
                  Connect Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            <IconFolder className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Edits</CardTitle>
            <IconBolt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Elements</CardTitle>
            <IconHistory className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">148</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" render={<Link to="/dashboard/projects" />} nativeButton={false}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : projects.length === 0 ? (
              <Empty className="py-12 border-none">
                <EmptyMedia>
                  <IconFolder className="w-10 h-10 text-muted-foreground opacity-20" />
                </EmptyMedia>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>Create your first project to start managing content.</EmptyDescription>
                <Button size="sm" className="mt-4" render={<Link to="/dashboard/projects/new" />} nativeButton={false}>
                  <IconPlus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Empty>
            ) : (
              <ItemGroup className="gap-0">
                {projects.slice(0, 5).map((project) => (
                  <Item key={project.id} variant="default" className="px-6 py-4 border-b last:border-0 rounded-none hover:bg-accent/50 group">
                    <ItemMedia variant="icon" className="w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-105">
                      <IconFolder className="w-5 h-5" />
                    </ItemMedia>
                    <ItemContent className="ml-4">
                      <ItemTitle className="text-sm font-semibold">{project.name}</ItemTitle>
                      <ItemDescription>{project.githubRepo}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant="outline" className="font-normal text-[10px] h-5">
                        {project.githubBranch}
                      </Badge>
                      <Button variant="ghost" size="icon-sm" render={<Link to="/dashboard/projects/$projectId" params={{ projectId: project.id }} />} nativeButton={false}>
                        <IconArrowRight className="w-4 h-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ItemGroup className="gap-0">
              <Item variant="default" className="px-6 py-6 border-b rounded-none hover:bg-accent/50 group">
                <ItemMedia variant="icon" className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                  <IconPlus className="w-5 h-5" />
                </ItemMedia>
                <ItemContent className="ml-4">
                  <ItemTitle className="text-base">New Project</ItemTitle>
                  <ItemDescription>Analyze a new GitHub repository</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" render={<Link to="/dashboard/projects/new" />} nativeButton={false}>
                    Start
                  </Button>
                </ItemActions>
              </Item>
              <Item variant="default" className="px-6 py-6 border-b rounded-none hover:bg-accent/50 group">
                <ItemMedia variant="icon" className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 shrink-0">
                  <IconSettings className="w-5 h-5" />
                </ItemMedia>
                <ItemContent className="ml-4">
                  <ItemTitle className="text-base">Organization Settings</ItemTitle>
                  <ItemDescription>Manage team and integrations</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" render={<Link to="/dashboard/settings" search={{ github: undefined, error: undefined }} />} nativeButton={false}>
                    Manage
                  </Button>
                </ItemActions>
              </Item>
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
