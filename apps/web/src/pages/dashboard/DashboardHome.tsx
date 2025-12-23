import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dashboardStatsQuery, currentOrgQuery } from "@/lib/queries";
import { useOrganization } from "@clerk/clerk-react";
import {
  IconPlus,
  IconBrandGithub,
  IconFolder,
  IconChevronRight,
  IconGitPullRequest,
  IconExternalLink,
} from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Item, ItemContent, ItemTitle, ItemDescription } from "@/ui/item";
import { Separator } from "@/ui/separator";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Status badge variant helper
function getStatusVariant(status: string) {
  switch (status) {
    case "ready":
      return "success";
    case "analyzing":
      return "outline";
    case "error":
      return "destructive";
    default:
      return "secondary";
  }
}

// Format relative time
function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DashboardHome() {
  const { organization } = useOrganization();
  const { data: dashboardData, isLoading } = useQuery(dashboardStatsQuery());
  const { data: orgData } = useQuery(currentOrgQuery());

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  const handleConnect = async () => {
    if (!orgData?.organization?.id) {
      toast.error("Organization data not loaded. Please try again.");
      return;
    }
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/organizations/${orgData.organization.id}/github/connect`
      );
      window.location.href = url;
    } catch (error) {
      console.error("GitHub connect error:", error);
      toast.error("Failed to initiate connection");
    }
  };

  if (!organization) return null;

  const stats = dashboardData?.stats;
  const recentProjects = dashboardData?.recentProjects || [];
  const recentPRs = dashboardData?.recentPullRequests || [];

  const statItems = [
    { label: "Projects", value: stats?.totalProjects ?? "-" },
    { label: "Elements", value: stats?.totalElements ?? "-" },
    { label: "Sections", value: stats?.totalSections ?? "-" },
    { label: "Pull Requests", value: stats?.totalPullRequests ?? "-" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
        </div>
        <Button
          size="sm"
          render={<Link to="/dashboard/projects/new" />}
          nativeButton={false}
        >
          <IconPlus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* GitHub Connection Banner */}
      {!hasGitHub && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <IconBrandGithub className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-500">
                  Connect GitHub to get started
                </p>
                <p className="text-xs text-amber-500/70">
                  Required to analyze and manage your repositories
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                onClick={handleConnect}
              >
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center h-18">
            {statItems.map((stat, index) => (
              <div key={stat.label} className="contents">
                <Item className="border-none rounded-none px-6 py-4 flex-1">
                  <ItemContent>
                    <ItemDescription>{stat.label}</ItemDescription>
                    <ItemTitle className="text-xl font-semibold">
                      {isLoading ? "-" : stat.value}
                    </ItemTitle>
                  </ItemContent>
                </Item>
                {index < statItems.length - 1 && (
                  <Separator
                    orientation="vertical"
                    className="!self-center h-[60%]"
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="py-3 px-4 flex-row items-center justify-between border-b">
          <CardTitle className="text-sm font-medium">Recent Projects</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            render={<Link to="/dashboard/projects" />}
            nativeButton={false}
          >
            View all
            <IconChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No projects yet
              </p>
              <Button
                size="sm"
                render={<Link to="/dashboard/projects/new" />}
                nativeButton={false}
              >
                <IconPlus className="w-4 h-4 mr-1.5" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to="/dashboard/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconFolder className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <Badge
                        variant={getStatusVariant(project.status)}
                        className="text-[10px] h-5"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <IconBrandGithub className="w-3 h-3" />
                        {project.githubRepo}
                      </span>
                      <span>{project.counts.elements} elements</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {project.deploymentUrl && (
                      <a
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View deployment"
                      >
                        <IconExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    <a
                      href={`https://github.com/${project.githubRepo}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="View on GitHub"
                    >
                      <IconBrandGithub className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    <IconChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Pull Requests */}
      {recentPRs.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4 flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-medium">
              Recent Pull Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {recentPRs.map((pr) => (
                <a
                  key={pr.id}
                  href={pr.githubPrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      pr.status === "merged"
                        ? "bg-purple-500/10"
                        : pr.status === "open"
                        ? "bg-green-500/10"
                        : "bg-muted"
                    )}
                  >
                    <IconGitPullRequest
                      className={cn(
                        "w-4 h-4",
                        pr.status === "merged"
                          ? "text-purple-500"
                          : pr.status === "open"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {pr.title}
                      </span>
                      <Badge
                        variant={
                          pr.status === "merged"
                            ? "default"
                            : pr.status === "open"
                            ? "success"
                            : "secondary"
                        }
                        className="text-[10px] h-5"
                      >
                        {pr.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{pr.project.name}</span>
                      <span>#{pr.githubPrNumber}</span>
                      <span>{formatRelativeTime(pr.createdAt)}</span>
                    </div>
                  </div>

                  <IconExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
