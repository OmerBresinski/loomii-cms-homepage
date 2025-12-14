import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { projectListQuery, currentOrgQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { organization } = useOrganization();
  const { data: orgData } = useQuery(currentOrgQuery());
  const { data: projectsData } = useQuery(projectListQuery({ limit: 5 }));

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-400">
          Here's an overview of your CMS activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Projects"
          value={String(projectsData?.pagination?.total || 0)}
        />
        <StatCard label="Pending Edits" value="0" />
        <StatCard label="Open PRs" value="0" />
      </div>

      {/* Getting Started / Quick Actions */}
      {!hasGitHub ? (
        <div className="border border-white/10 rounded-lg p-6 mb-8 bg-[#111]">
          <h2 className="text-lg font-semibold mb-2">Get Started</h2>
          <p className="text-gray-400 text-sm mb-4">
            Connect your GitHub account to start creating projects and managing content.
          </p>
          <Button asChild>
            <Link to="/dashboard/settings">
              <GitHubIcon className="w-4 h-4 mr-2" />
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
                <PlusIcon className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/projects">View All Projects</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Recent Projects */}
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
                  <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <FolderIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
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
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
