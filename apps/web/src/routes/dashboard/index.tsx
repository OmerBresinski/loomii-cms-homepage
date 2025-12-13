import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div className="p-8 animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-foreground-muted">Here's an overview of your CMS activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Projects" value="0" />
        <StatCard label="Pending Edits" value="0" />
        <StatCard label="Open PRs" value="0" />
      </div>

      {/* Quick Actions */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link to="/dashboard/projects/new" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-foreground-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>No activity yet. Create your first project to get started.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-foreground-subtle text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

