import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery, orgReposQuery, repoFoldersQuery } from "@/lib/queries";
import { useCreateProject } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Lock, Loader2, Folder, FolderRoot } from "lucide-react";

export function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [repoOpen, setRepoOpen] = useState(false);

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
    <div className="p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Connect your GitHub repository to get started.</p>
        </div>

        {!hasGitHubConnected ? (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-500">GitHub Not Connected</CardTitle>
              <CardDescription>You need to connect GitHub before creating a project.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate({ to: "/dashboard/settings", search: {} })}>Connect GitHub</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Configure your new project</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="repo">GitHub Repository</Label>
                  {reposLoading ? (
                    <div className="h-10 bg-muted rounded-md animate-pulse" />
                  ) : (
                    <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={repoOpen}
                          className={cn(
                            "w-full justify-between font-mono text-sm h-10",
                            !formData.githubRepo && "text-muted-foreground"
                          )}
                        >
                          {selectedRepo ? (
                            <span className="flex items-center gap-2">
                              {selectedRepo.fullName}
                              {selectedRepo.private && <Lock className="h-3 w-3 text-muted-foreground" />}
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
                                <CommandItem key={repo.id} value={repo.fullName} onSelect={handleRepoSelect} className="font-mono text-sm">
                                  <Check className={cn("mr-2 h-4 w-4", formData.githubRepo === repo.fullName ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                      {repo.fullName}
                                      {repo.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                                    </span>
                                    {repo.description && <span className="text-xs text-muted-foreground truncate font-sans">{repo.description}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {formData.githubRepo && (
                  <div className="space-y-2">
                    <Label>
                      Source Folder
                      <span className="text-muted-foreground font-normal ml-2">(for monorepos)</span>
                    </Label>
                    {foldersLoading ? (
                      <div className="h-10 bg-muted rounded-md flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select
                        value={formData.rootPath || ROOT_PATH_VALUE}
                        onValueChange={(value) => setFormData({ ...formData, rootPath: value })}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue>
                            {formData.rootPath && formData.rootPath !== ROOT_PATH_VALUE ? (
                              <span className="flex items-center gap-2 font-mono text-sm">
                                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                {formData.rootPath}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-sm">
                                <FolderRoot className="h-3.5 w-3.5 text-muted-foreground" />
                                (root) - entire repository
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {foldersData?.folders.map((folder) => (
                            <SelectItem
                              key={folder.path || ROOT_PATH_VALUE}
                              value={folder.path || ROOT_PATH_VALUE}
                              className="font-mono text-sm"
                            >
                              <span className="flex items-center gap-2">
                                {folder.path === "" ? (
                                  <>
                                    <FolderRoot className="h-3.5 w-3.5 text-muted-foreground" />
                                    (root) - entire repository
                                  </>
                                ) : (
                                  <>
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span style={{ paddingLeft: `${(folder.depth - 1) * 12}px` }}>
                                      {folder.path}
                                    </span>
                                  </>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select the folder containing your source code. Useful for monorepos.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="My Website"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubBranch">Branch</Label>
                  <Input
                    id="githubBranch"
                    placeholder="main"
                    className="font-mono"
                    value={formData.githubBranch}
                    onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deploymentUrl">
                    Deployment URL
                    <span className="text-muted-foreground font-normal ml-2">(optional)</span>
                  </Label>
                  <Input
                    id="deploymentUrl"
                    type="url"
                    placeholder="https://your-site.vercel.app"
                    value={formData.deploymentUrl}
                    onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">The live URL where your site is deployed</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={createProject.isPending || !formData.githubRepo}>
                    {createProject.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard/projects" })}>
                    Cancel
                  </Button>
                </div>

                {createProject.isError && <p className="text-sm text-destructive">Failed to create project.</p>}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
