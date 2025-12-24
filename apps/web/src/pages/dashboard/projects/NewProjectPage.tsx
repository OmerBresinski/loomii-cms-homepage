import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery, orgReposQuery, repoFoldersQuery } from "@/lib/queries";
import { useCreateProject } from "@/lib/mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconSelector,
  IconLock,
  IconLoader2,
  IconFolder,
  IconBrandGithub,
  IconArrowLeft,
  IconChevronRight,
} from "@tabler/icons-react";

export function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [repoOpen, setRepoOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!triggerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTriggerWidth(entry.contentRect.width);
      }
    });
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, []);

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard/projects" className="hover:text-primary transition-colors">
          Projects
        </Link>
        <IconChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">New Project</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-title">
            New Project
          </h1>
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
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <IconBrandGithub className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-500">
                  Connect GitHub to get started
                </p>
                <p className="text-xs text-amber-500/70">
                  Required to access your repositories
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                onClick={() => navigate({ to: "/dashboard/settings" })}
              >
                Connect GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Repository Selection Card */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconBrandGithub className="w-4 h-4" />
                Repository
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Repository Selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select Repository</label>
                {reposLoading ? (
                  <div className="h-10 bg-muted rounded-md animate-pulse" />
                ) : (
                  <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          ref={triggerRef}
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-mono text-sm h-10",
                            !formData.githubRepo && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      {selectedRepo ? (
                        <span className="flex items-center gap-2">
                          <IconBrandGithub className="w-4 h-4" />
                          {selectedRepo.fullName}
                          {selectedRepo.private && <IconLock className="h-3 w-3 opacity-50" />}
                        </span>
                      ) : (
                        "Select repository..."
                      )}
                      <IconSelector className="h-4 w-4 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0"
                      align="start"
                      style={{ width: triggerWidth ? `${triggerWidth}px` : "auto" }}
                    >
                      <Command>
                        <CommandInput placeholder="Search repositories..." />
                        <CommandList className="max-h-[280px]">
                          <CommandEmpty>No repositories found.</CommandEmpty>
                          <CommandGroup>
                            {reposData?.repos.map((repo) => (
                              <CommandItem
                                key={repo.id}
                                value={repo.fullName}
                                onSelect={handleRepoSelect}
                                className="py-2.5"
                              >
                                <span className="flex items-center gap-2 font-mono text-sm flex-1">
                                  {repo.fullName}
                                  {repo.private && <IconLock className="h-3 w-3 opacity-50" />}
                                </span>
                                <IconCheck
                                  className={cn(
                                    "h-4 w-4",
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
              {formData.githubRepo && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Branch</label>
                    <Input
                      placeholder="main"
                      className="h-10 font-mono text-sm"
                      value={formData.githubBranch}
                      onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Root Folder</label>
                    {foldersLoading ? (
                      <div className="h-10 bg-muted rounded-md flex items-center justify-center border">
                        <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select
                        value={formData.rootPath || ROOT_PATH_VALUE}
                        onValueChange={(value) => setFormData({ ...formData, rootPath: value })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue>
                            <span className="flex items-center gap-2 font-mono text-sm">
                              <IconFolder className="h-3.5 w-3.5 opacity-50" />
                              {formData.rootPath && formData.rootPath !== ROOT_PATH_VALUE
                                ? formData.rootPath
                                : "(root)"}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {foldersData?.folders.map((folder) => (
                            <SelectItem
                              key={folder.path || ROOT_PATH_VALUE}
                              value={folder.path || ROOT_PATH_VALUE}
                              className="font-mono text-xs"
                            >
                              <span className="flex items-center gap-2">
                                <IconFolder className="h-3 w-3 opacity-50" />
                                {folder.path === "" ? "(root)" : folder.path}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Details Card */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconFolder className="w-4 h-4" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  placeholder="My Project"
                  className="h-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  How this project appears in your dashboard
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Deployment URL
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://your-site.com"
                  className="h-10"
                  value={formData.deploymentUrl}
                  onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Used for previewing changes on your live site
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {createProject.isError && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg border border-destructive/20">
              Failed to create project. Please try again.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={createProject.isPending || !formData.githubRepo || !formData.name}
            >
              {createProject.isPending ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
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
        </form>
      )}
    </div>
  );
}
