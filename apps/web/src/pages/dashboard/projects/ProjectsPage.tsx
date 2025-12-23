import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectListQuery, projectDetailQuery, projectPagesQuery, analysisStatusQuery, sectionListQuery } from "@/lib/queries";
import { useOrganization } from "@clerk/clerk-react";
import {
  IconPlus,
  IconFolder,
  IconBrandGithub,
  IconGitBranch,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

export function ProjectsPage() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { data: projectsData, isLoading } = useQuery(projectListQuery());
  const projects = projectsData?.projects ?? [];

  const handlePrefetch = (projectId: string) => {
    const staleTime = 60000;
    queryClient.prefetchQuery({ ...projectDetailQuery(projectId), staleTime });
    queryClient.prefetchQuery({ ...projectPagesQuery(projectId), staleTime });
    queryClient.prefetchQuery({ ...analysisStatusQuery(projectId), staleTime });
    queryClient.prefetchQuery({ ...sectionListQuery(projectId), staleTime });
  };

  if (!organization) return null;

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-title">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your repository content
          </p>
        </div>
        <Button
          size="sm"
          render={<Link to="/dashboard/projects/new" />}
          nativeButton={false}
        >
          <IconPlus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Projects List */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <IconFolder className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect a GitHub repository to get started
            </p>
            <Button
              size="sm"
              render={<Link to="/dashboard/projects/new" />}
              nativeButton={false}
            >
              <IconPlus className="w-4 h-4 mr-1.5" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/dashboard/projects/$projectId"
                params={{ projectId: project.id }}
                onMouseEnter={() => handlePrefetch(project.id)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                )}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconFolder className="w-4 h-4 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 shrink-0"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1 truncate">
                      <IconBrandGithub className="w-3 h-3 shrink-0" />
                      {project.githubRepo}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <IconGitBranch className="w-3 h-3" />
                      {project.githubBranch}
                    </span>
                    {project.rootPath && project.rootPath !== "/" && (
                      <span className="truncate">{project.rootPath}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <IconChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {projects.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
