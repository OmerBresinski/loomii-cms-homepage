import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery, orgReposQuery, repoFoldersQuery } from "@/lib/queries";
import { useCreateProject } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Field, FieldLabel, FieldContent, FieldDescription, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Lock, Loader2, Folder, FolderRoot, Plus, Github, Globe } from "lucide-react";

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
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
        <p className="text-muted-foreground">Analyze a repository to start managing its content.</p>
      </div>

      {!hasGitHubConnected ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Github className="w-6 h-6 text-amber-500" />
            </div>
            <CardTitle className="text-amber-500">GitHub Connection Required</CardTitle>
            <CardDescription className="text-amber-500/70">
              You must connect your GitHub account before you can create a new project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: "/dashboard/settings", search: {} })} className="bg-amber-500 hover:bg-amber-600 text-white">
               Connect GitHub Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
               <Github className="w-4 h-4 text-primary" />
               <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Source</h2>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-8">
                <Field>
                  <FieldLabel>GitHub Repository</FieldLabel>
                  <FieldContent>
                    {reposLoading ? (
                      <div className="h-11 bg-muted rounded-md animate-pulse p-2 px-3 overflow-hidden">
                         <div className="h-full bg-muted-foreground/10 rounded-sm w-1/3" />
                      </div>
                    ) : (
                      <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-between font-mono text-sm h-11 bg-muted/20 border-border px-4",
                                !formData.githubRepo && "text-muted-foreground"
                              )}
                            />
                          }
                        >
                          {selectedRepo ? (
                            <span className="flex items-center gap-2">
                              <Github className="w-4 h-4 text-primary" />
                              {selectedRepo.fullName}
                              {selectedRepo.private && <Lock className="h-3 w-3 opacity-50" />}
                            </span>
                          ) : (
                            "Select a repository..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search your repositories..." />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>No repository found.</CommandEmpty>
                              <CommandGroup>
                                {reposData?.repos.map((repo) => (
                                  <CommandItem key={repo.id} value={repo.fullName} onSelect={handleRepoSelect} className="py-3 px-4">
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="flex items-center gap-2 font-mono text-sm">
                                        {repo.fullName}
                                        {repo.private && <Lock className="h-3 w-3 opacity-50" />}
                                      </span>
                                      {repo.description && <span className="text-[10px] text-muted-foreground truncate font-sans mt-0.5">{repo.description}</span>}
                                    </div>
                                    <Check className={cn("ml-2 h-4 w-4 text-primary", formData.githubRepo === repo.fullName ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </FieldContent>
                  <FieldDescription>Select the repository you want to manage content for.</FieldDescription>
                </Field>

                {formData.githubRepo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-dashed">
                    <Field>
                      <FieldLabel>Branch</FieldLabel>
                      <FieldContent>
                        <Input
                          placeholder="main"
                          className="font-mono h-11 bg-muted/20"
                          value={formData.githubBranch}
                          onChange={(e) => setFormData({ ...formData, githubBranch: e.target.value })}
                        />
                      </FieldContent>
                      <FieldDescription>Defaults to repo primary branch.</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Root Folder</FieldLabel>
                      <FieldContent>
                        {foldersLoading ? (
                          <div className="h-11 bg-muted/20 rounded-md flex items-center justify-center border border-border">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <Select
                            value={formData.rootPath || ROOT_PATH_VALUE}
                            onValueChange={(value) => setFormData({ ...formData, rootPath: value })}
                          >
                            <SelectTrigger className="w-full h-11 bg-muted/20 border-border">
                              <SelectValue>
                                {formData.rootPath && formData.rootPath !== ROOT_PATH_VALUE ? (
                                  <span className="flex items-center gap-2 font-mono text-sm text-primary">
                                    <Folder className="h-4 w-4" />
                                    {formData.rootPath}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2 text-sm text-primary">
                                    <FolderRoot className="h-4 w-4" />
                                    (root)
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {foldersData?.folders.map((folder) => (
                                <SelectItem
                                  key={folder.path || ROOT_PATH_VALUE}
                                  value={folder.path || ROOT_PATH_VALUE}
                                  className="font-mono text-xs py-2.5"
                                >
                                  <span className="flex items-center gap-2">
                                    {folder.path === "" ? (
                                      <>
                                        <FolderRoot className="h-3.5 w-3.5 opacity-50" />
                                        (root)
                                      </>
                                    ) : (
                                      <>
                                        <Folder className="h-3.5 w-3.5 opacity-50" />
                                        <span style={{ paddingLeft: `${(folder.depth - 1) * 8}px` }}>
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
                      </FieldContent>
                      <FieldDescription>Select source folder for monorepos.</FieldDescription>
                    </Field>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
             <div className="flex items-center gap-2 px-1">
               <Globe className="w-4 h-4 text-primary" />
               <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Project Details</h2>
             </div>
             <Card>
                <CardContent className="pt-6 space-y-8">
                  <Field>
                    <FieldLabel>Project Name</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g. Marketing Site"
                        className="h-11 bg-muted/20"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </FieldContent>
                    <FieldDescription>How the project will be displayed in Loomii.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>Live Deployment URL</FieldLabel>
                    <FieldContent>
                      <Input
                        type="url"
                        placeholder="https://your-site.com"
                        className="h-11 bg-muted/20"
                        value={formData.deploymentUrl}
                        onChange={(e) => setFormData({ ...formData, deploymentUrl: e.target.value })}
                      />
                    </FieldContent>
                    <FieldDescription>Optional. Used for previewing changes live.</FieldDescription>
                  </Field>
                </CardContent>
             </Card>
          </section>

          <div className="flex gap-4 pt-6">
            <Button size="lg" type="submit" disabled={createProject.isPending || !formData.githubRepo} className="min-w-[140px]">
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
            <Button size="lg" type="button" variant="outline" onClick={() => navigate({ to: "/dashboard/projects" })}>
              Cancel
            </Button>
          </div>

          {createProject.isError && (
            <FieldError className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              Failed to create project. Please try again later.
            </FieldError>
          )}
        </form>
      )}
    </div>
  );
}
