import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, ChevronRight } from "lucide-react";

export function ProjectsPage() {
  const { data, isLoading } = useQuery(projectListQuery({ limit: 20 }));
  const projects = data?.projects || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your connected websites.</p>
        </div>
        <Link to="/dashboard/projects/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-md text-sm font-medium">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Connect your first GitHub repository to start.</p>
            <Link to="/dashboard/projects/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-md text-sm font-medium">
              Create your first project
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/dashboard/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
              >
                <div>
                  <h3 className="font-medium mb-1">{project.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{project.githubRepo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={project.status} />
                  <span className="text-sm text-muted-foreground">{project.elementCount || 0} elements</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
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
