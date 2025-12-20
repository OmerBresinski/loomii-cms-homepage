import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery, currentOrgQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Github, Folder, ChevronRight } from "lucide-react";

export function DashboardHome() {
  const { data: orgData } = useQuery(currentOrgQuery());
  const { data: projectsData } = useQuery(projectListQuery({ limit: 5 }));

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Here's an overview of your CMS activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projectsData?.pagination?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Edits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open PRs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      {!hasGitHub ? (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Connect your GitHub account to start creating projects.</p>
            <Link to="/dashboard/settings" search={{}} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-md text-sm font-medium">
              <Github className="w-4 h-4" />
              Connect GitHub
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link to="/dashboard/projects/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-md text-sm font-medium">
              <Plus className="w-4 h-4" />
              New Project
            </Link>
            <Link to="/dashboard/projects" className="inline-flex items-center gap-2 border border-border hover:bg-accent h-8 px-3 rounded-md text-sm font-medium">
              View All Projects
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projectsData?.projects && projectsData.projects.length > 0 ? (
            <div className="divide-y divide-border">
              {projectsData.projects.map((project) => (
                <Link
                  key={project.id}
                  to="/dashboard/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.githubRepo}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={project.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <Folder className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No projects yet. Create your first project to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    ready: "success",
    analyzing: "warning",
    pending: "secondary",
    error: "destructive",
  };

  return (
    <Badge variant={variants[status] || "secondary"}>
      {status}
    </Badge>
  );
}
