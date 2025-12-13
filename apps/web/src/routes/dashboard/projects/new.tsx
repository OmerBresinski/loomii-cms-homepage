import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    githubRepo: "",
    githubBranch: "main",
    deploymentUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Submit to API using TanStack Query mutation
      console.log("Creating project:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to the new project
      navigate({ to: "/dashboard/projects" });
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 animate-in">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
        <p className="text-foreground-muted mb-8">
          Connect your GitHub repository and deployment URL to get started.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              className="input"
              placeholder="My Website"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="githubRepo" className="block text-sm font-medium mb-2">
              GitHub Repository
            </label>
            <input
              type="text"
              id="githubRepo"
              className="input font-mono"
              placeholder="owner/repository"
              value={formData.githubRepo}
              onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
              required
            />
            <p className="text-xs text-foreground-subtle mt-1">
              Format: owner/repository (e.g., vercel/next.js)
            </p>
          </div>

          <div>
            <label htmlFor="githubBranch" className="block text-sm font-medium mb-2">
              Branch
            </label>
            <input
              type="text"
              id="githubBranch"
              className="input font-mono"
              placeholder="main"
              value={formData.githubBranch}
              onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="deploymentUrl" className="block text-sm font-medium mb-2">
              Deployment URL
            </label>
            <input
              type="url"
              id="deploymentUrl"
              className="input"
              placeholder="https://your-site.vercel.app"
              value={formData.deploymentUrl}
              onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
              required
            />
            <p className="text-xs text-foreground-subtle mt-1">
              The live URL where your site is deployed
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate({ to: "/dashboard/projects" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

