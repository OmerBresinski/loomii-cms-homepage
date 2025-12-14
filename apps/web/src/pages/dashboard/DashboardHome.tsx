import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectListQuery, currentOrgQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Plus, Github, Folder, ChevronRight } from "lucide-react";

export function DashboardHome() {
  const { data: orgData } = useQuery(currentOrgQuery());
  const { data: projectsData } = useQuery(projectListQuery({ limit: 5 }));

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-400">Here's an overview of your CMS activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Projects" value={String(projectsData?.pagination?.total || 0)} />
        <StatCard label="Pending Edits" value="0" />
        <StatCard label="Open PRs" value="0" />
      </div>

      {!hasGitHub ? (
        <div className="border border-white/10 rounded-lg p-6 mb-8 bg-[#111]">
          <h2 className="text-lg font-semibold mb-2">Get Started</h2>
          <p className="text-gray-400 text-sm mb-4">Connect your GitHub account to start creating projects.</p>
          <Button asChild>
            <Link to="/dashboard/settings">
              <Github className="w-4 h-4 mr-2" />
              Connect GitHub
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg p-6 mb-8 bg-[#111]">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/dashboard/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/projects">View All Projects</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="border border-white/10 rounded-lg bg-[#111]">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold">Recent Projects</h2>
        </div>
        {projectsData?.projects && projectsData.projects.length > 0 ? (
          <div className="divide-y divide-white/10">
            {projectsData.projects.map((project) => (
              <Link
                key={project.id}
                to="/dashboard/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.githubRepo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={project.status} />
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <Folder className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No projects yet. Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 rounded-lg p-5 bg-[#111]">
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
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

