import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/projects/")({
  component: ProjectsPage,
});

function ProjectsPage() {
  // TODO: Fetch projects with TanStack Query
  const projects: Array<{
    id: string;
    name: string;
    githubRepo: string;
    status: string;
    updatedAt: string;
  }> = [];

  return (
    <div className="p-8 animate-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Projects</h1>
          <p className="text-foreground-muted">Manage your connected websites.</p>
        </div>
        <Link to="/dashboard/projects/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-foreground-muted mb-6">
            Connect your first GitHub repository to start editing content.
          </p>
          <Link to="/dashboard/projects/new" className="btn-primary">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/dashboard/projects/$projectId"
              params={{ projectId: project.id }}
              className="card hover:border-border-hover transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold mb-1">{project.name}</h3>
                <p className="text-sm text-foreground-muted">{project.githubRepo}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge-accent">{project.status}</span>
                <span className="text-sm text-foreground-subtle">{project.updatedAt}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

