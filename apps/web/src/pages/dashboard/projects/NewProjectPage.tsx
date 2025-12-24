import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery, orgReposQuery, repoFoldersQuery, repoBranchesQuery } from "@/lib/queries";
import { useCreateProject } from "@/lib/mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconSelector,
  IconLock,
  IconLoader2,
  IconFolder,
  IconBrandGithub,
  IconArrowLeft,
  IconGitBranch,
} from "@tabler/icons-react";

export function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  const { data: orgData } = useQuery(currentOrgQuery());
  const orgId = orgData?.organization?.id || "";
  const { data: reposData, isLoading: reposLoading } = useQuery(orgReposQuery(orgId));

  const [formData, setFormData] = useState({
    name: "",
    githubRepo: "",
    githubBranch: "main",
    rootPath: "",
    deploymentUrl: "",
  });

  const selectedRepo = reposData?.repos.find((r) => r.fullName === formData.githubRepo);

  const { data: branchesData, isLoading: branchesLoading } = useQuery(
    repoBranchesQuery(orgId, formData.githubRepo)
  );

  const { data: foldersData, isLoading: foldersLoading } = useQuery(
    repoFoldersQuery(orgId, formData.githubRepo, formData.githubBranch)
  );

  const handleRepoSelect = (repoFullName: string) => {
    const repo = reposData?.repos.find((r) => r.fullName === repoFullName);
    if (repo) {
      setFormData({
        ...formData,
        githubRepo: repo.fullName,
        githubBranch: repo.defaultBranch,
        rootPath: "",
        name: formData.name || repo.name,
      });
    }
    setRepoOpen(false);
  };

  const ROOT_PATH_VALUE = "__root__";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        rootPath: formData.rootPath === ROOT_PATH_VALUE ? "" : formData.rootPath,
      };
      const result = await createProject.mutateAsync(submitData);
      navigate({ to: "/dashboard/projects/$projectId", params: { projectId: result.project.id } });
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const hasGitHubConnected = orgData?.organization?.hasGitHubConnected;

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-title">New Project</h1>
          <p className="text-sm text-muted-foreground">
            Connect a GitHub repository to manage its content
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/dashboard/projects" })}
        >
          <IconArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
      </div>

      {/* GitHub Connection Required */}
      {!hasGitHubConnected ? (
        <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <IconBrandGithub className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Connect GitHub to get started</p>
              <p className="text-xs text-muted-foreground">
                Required to access your repositories
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/dashboard/settings", search: { github: undefined, error: undefined } })}
            >
              Connect GitHub
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm divide-y divide-border/50">
            {/* Repository Row */}
            <div className="px-4 py-3 space-y-3">
              {/* Repository */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Repository</label>
                {reposLoading ? (
                  <div className="h-6 bg-muted/50 rounded-md animate-pulse" />
                ) : (
                  <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                    <PopoverTrigger className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-between font-mono text-xs",
                          !formData.githubRepo && "text-muted-foreground"
                        )}
                      >
                        {selectedRepo ? (
                          <span className="flex items-center gap-1.5">
                            <IconBrandGithub className="w-3.5 h-3.5 opacity-50" />
                            {selectedRepo.fullName}
                            {selectedRepo.private && <IconLock className="h-3 w-3 opacity-50" />}
                          </span>
                        ) : (
                          "Select a repository..."
                        )}
                        <IconSelector className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-(--anchor-width)" align="start">
                      <Command>
                        <CommandInput placeholder="Search repositories..." />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>No repositories found.</CommandEmpty>
                          <CommandGroup>
                            {reposData?.repos.map((repo) => (
                              <CommandItem
                                key={repo.id}
                                value={repo.fullName}
                                onSelect={handleRepoSelect}
                              >
                                <span className="flex items-center gap-1.5 font-mono text-xs flex-1">
                                  {repo.fullName}
                                  {repo.private && <IconLock className="h-3 w-3 opacity-50" />}
                                </span>
                                <IconCheck
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    formData.githubRepo === repo.fullName ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Branch & Folder */}
              <div className="grid grid-cols-2 gap-3">
                {/* Branch */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  {branchesLoading && formData.githubRepo ? (
                    <div className="h-6 bg-muted/50 rounded-md flex items-center justify-center border">
                      <IconLoader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Popover open={branchOpen} onOpenChange={(open) => formData.githubRepo && setBranchOpen(open)}>
                      <PopoverTrigger className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!formData.githubRepo}
                          className={cn(
                            "w-full justify-between font-mono text-xs",
                            !formData.githubBranch && "text-muted-foreground"
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <IconGitBranch className="w-3.5 h-3.5 opacity-50" />
                            {formData.githubBranch || "Select branch..."}
                          </span>
                          <IconSelector className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-(--anchor-width)" align="start">
                        <Command>
                          <CommandInput placeholder="Search branches..." />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty>No branches found.</CommandEmpty>
                            <CommandGroup>
                              {branchesData?.branches.map((branch) => (
                                <CommandItem
                                  key={branch.name}
                                  value={branch.name}
                                  onSelect={(value) => {
                                    setFormData({ ...formData, githubBranch: value, rootPath: "" });
                                    setBranchOpen(false);
                                  }}
                                >
                                  <span className="flex items-center gap-1.5 font-mono text-xs flex-1">
                                    <IconGitBranch className="h-3 w-3 opacity-50" />
                                    {branch.name}
                                  </span>
                                  <IconCheck
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      formData.githubBranch === branch.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Root Folder */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Root Folder</label>
                  {foldersLoading && formData.githubRepo ? (
                    <div className="h-6 bg-muted/50 rounded-md flex items-center justify-center border">
                      <IconLoader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Popover open={folderOpen} onOpenChange={(open) => formData.githubRepo && setFolderOpen(open)}>
                      <PopoverTrigger className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!formData.githubRepo}
                          className={cn(
                            "w-full justify-between font-mono text-xs",
                            !formData.rootPath && "text-muted-foreground"
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <IconFolder className="w-3.5 h-3.5 opacity-50" />
                            {formData.rootPath && formData.rootPath !== ROOT_PATH_VALUE
                              ? formData.rootPath
                              : "(root)"}
                          </span>
                          <IconSelector className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-(--anchor-width)" align="start">
                        <Command>
                          <CommandInput placeholder="Search folders..." />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty>No folders found.</CommandEmpty>
                            <CommandGroup>
                              {foldersData?.folders.map((folder) => (
                                <CommandItem
                                  key={folder.path || ROOT_PATH_VALUE}
                                  value={folder.path || ROOT_PATH_VALUE}
                                  onSelect={(value) => {
                                    setFormData({ ...formData, rootPath: value });
                                    setFolderOpen(false);
                                  }}
                                >
                                  <span className="flex items-center gap-1.5 font-mono text-xs flex-1">
                                    <IconFolder className="h-3 w-3 opacity-50" />
                                    {folder.path === "" ? "(root)" : folder.path}
                                  </span>
                                  <IconCheck
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      (formData.rootPath || ROOT_PATH_VALUE) === (folder.path || ROOT_PATH_VALUE)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>

            {/* Project Details Row */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                  <Input
                    placeholder="My Project"
                    className="h-6 text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Deployment URL
                    <span className="opacity-50 ml-1">(optional)</span>
                  </label>
                  <Input
                    type="url"
                    placeholder="https://your-site.com"
                    className="h-6 text-xs"
                    value={formData.deploymentUrl}
                    onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/dashboard/projects" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createProject.isPending || !formData.githubRepo || !formData.name}
              >
                {createProject.isPending ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {createProject.isError && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20">
              Failed to create project. Please try again.
            </div>
          )}
        </form>
      )}
    </div>
  );
}
