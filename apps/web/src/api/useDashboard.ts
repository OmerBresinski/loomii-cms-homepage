import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface DashboardStats {
  totalProjects: number;
  totalElements: number;
  totalSections: number;
  totalPullRequests: number;
  projectsByStatus: Record<string, number>;
}

export interface RecentProject {
  id: string;
  name: string;
  githubRepo: string;
  githubBranch: string;
  deploymentUrl: string | null;
  status: string;
  lastAnalyzedAt: string | null;
  updatedAt: string;
  counts: {
    elements: number;
    sections: number;
    pullRequests: number;
  };
}

export interface RecentPullRequest {
  id: string;
  title: string;
  status: string;
  githubPrUrl: string;
  githubPrNumber: number;
  createdAt: string;
  mergedAt: string | null;
  project: {
    name: string;
    githubRepo: string;
  };
  user: {
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  recentProjects: RecentProject[];
  recentPullRequests: RecentPullRequest[];
  organization: {
    id: string;
    name: string;
    hasGitHubConnected: boolean;
    githubOrgName: string | null;
  };
}

export function dashboardStatsQuery() {
  return queryOptions({
    queryKey: ["dashboard", "stats"] as const,
    queryFn: async () => {
      return apiFetch<DashboardData>("/dashboard/stats");
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
