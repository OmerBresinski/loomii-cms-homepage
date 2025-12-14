import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Plus, Folder, ChevronRight } from "lucide-react";

export function ProjectsPage() {
  const { data, isLoading } = useQuery(projectListQuery({ limit: 20 }));
  const projects = data?.projects || [];

  return (
    <div className="p-8 animate-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Projects</h1>
          <p className="text-gray-400">Manage your connected websites.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-white/10 rounded-lg bg-[#111] text-center py-16">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Connect your first GitHub repository to start.</p>
          <Button asChild>
            <Link to="/dashboard/projects/new">Create your first project</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg bg-[#111] divide-y divide-white/10">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/dashboard/projects/$projectId"
              params={{ projectId: project.id }}
              className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
            >
              <div>
                <h3 className="font-medium mb-1">{project.name}</h3>
                <p className="text-sm text-gray-500 font-mono">{project.githubRepo}</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={project.status} />
                <span className="text-sm text-gray-500">{project.elementCount || 0} elements</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    analyzing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    pending: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

