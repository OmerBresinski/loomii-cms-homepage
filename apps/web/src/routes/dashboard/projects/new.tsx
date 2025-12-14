import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery, orgReposQuery } from "@/lib/queries";
import { useCreateProject } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/projects/new")({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [open, setOpen] = useState(false);

  const { data: orgData } = useQuery(currentOrgQuery());
  const orgId = orgData?.organization?.id || "";
  const { data: reposData, isLoading: reposLoading } = useQuery(orgReposQuery(orgId));

  const [formData, setFormData] = useState({
    name: "",
    githubRepo: "",
    githubBranch: "main",
    deploymentUrl: "",
  });

  const selectedRepo = reposData?.repos.find((r) => r.fullName === formData.githubRepo);

  const handleRepoSelect = (repoFullName: string) => {
    const repo = reposData?.repos.find((r) => r.fullName === repoFullName);
    if (repo) {
      setFormData({
        ...formData,
        githubRepo: repo.fullName,
        githubBranch: repo.defaultBranch,
        name: formData.name || repo.name,
      });
    }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createProject.mutateAsync(formData);
      navigate({ to: `/dashboard/projects/${result.project.id}` });
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const hasGitHubConnected = orgData?.organization?.hasGitHubConnected;

  return (
    <div className="p-8 animate-in">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-400 mb-8">
          Connect your GitHub repository and deployment URL to get started.
        </p>

        {!hasGitHubConnected ? (
          <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
            <h3 className="font-medium text-yellow-400 mb-2">GitHub Not Connected</h3>
            <p className="text-sm text-gray-400 mb-4">
              You need to connect GitHub to your organization before creating a project.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard/settings" })}>
              Connect GitHub
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Repository Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                GitHub Repository
              </label>
              {reposLoading ? (
                <div className="h-10 bg-white/5 rounded-md animate-pulse" />
              ) : (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "w-full justify-between font-mono text-sm h-10 bg-[#111] border-white/10 hover:bg-white/5",
                        !formData.githubRepo && "text-gray-500"
                      )}
                    >
                      {selectedRepo ? (
                        <span className="flex items-center gap-2">
                          {selectedRepo.fullName}
                          {selectedRepo.private && (
                            <Lock className="h-3 w-3 text-gray-500" />
                          )}
                        </span>
                      ) : (
                        "Search repositories..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search repositories..." />
                      <CommandList className="max-h-[150px]">
                        <CommandEmpty>No repository found.</CommandEmpty>
                        <CommandGroup>
                          {reposData?.repos.map((repo) => (
                            <CommandItem
                              key={repo.id}
                              value={repo.fullName}
                              onSelect={handleRepoSelect}
                              className="font-mono text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.githubRepo === repo.fullName
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                  {repo.fullName}
                                  {repo.private && (
                                    <Lock className="h-3 w-3 text-gray-500" />
                                  )}
                                </span>
                                {repo.description && (
                                  <span className="text-xs text-gray-500 truncate font-sans">
                                    {repo.description}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {reposData?.repos.length === 0 && (
                <p className="text-xs text-yellow-400 mt-2">
                  No repositories found. Make sure you have access to at least one repository.
                </p>
              )}
            </div>

            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Project Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full h-10 px-4 rounded-md bg-[#111] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="My Website"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Branch */}
            <div>
              <label htmlFor="githubBranch" className="block text-sm font-medium mb-2">
                Branch
              </label>
              <input
                type="text"
                id="githubBranch"
                className="w-full h-10 px-4 rounded-md bg-[#111] border border-white/10 text-white font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="main"
                value={formData.githubBranch}
                onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
              />
            </div>

            {/* Deployment URL */}
            <div>
              <label htmlFor="deploymentUrl" className="block text-sm font-medium mb-2">
                Deployment URL
              </label>
              <input
                type="url"
                id="deploymentUrl"
                className="w-full h-10 px-4 rounded-md bg-[#111] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="https://your-site.vercel.app"
                value={formData.deploymentUrl}
                onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The live URL where your site is deployed
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/dashboard/projects" })}
              >
                Cancel
              </Button>
            </div>

            {createProject.isError && (
              <p className="text-sm text-red-400">
                Failed to create project. Please try again.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
