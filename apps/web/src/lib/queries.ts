import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./api";

// Query keys
export const queryKeys = {
  all: ["ai-cms"] as const,
  auth: () => [...queryKeys.all, "auth"] as const,
  me: () => [...queryKeys.auth(), "me"] as const,
  projects: () => [...queryKeys.all, "projects"] as const,
  projectList: (params: { page?: number; limit?: number }) =>
    [...queryKeys.projects(), "list", params] as const,
  projectDetail: (id: string) => [...queryKeys.projects(), "detail", id] as const,
  elements: (projectId: string) => [...queryKeys.all, "elements", projectId] as const,
  elementList: (projectId: string, params: { page?: number }) =>
    [...queryKeys.elements(projectId), "list", params] as const,
  edits: (projectId: string) => [...queryKeys.all, "edits", projectId] as const,
  editList: (projectId: string, params: { page?: number; status?: string }) =>
    [...queryKeys.edits(projectId), "list", params] as const,
  analysis: (projectId: string) => [...queryKeys.all, "analysis", projectId] as const,
} as const;

// Types
interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Project {
  id: string;
  name: string;
  githubRepo: string;
  githubBranch: string;
  deploymentUrl: string;
  status: string;
  elementCount?: number;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Element {
  id: string;
  name: string;
  type: string;
  selector: string;
  currentValue: string | null;
  pageUrl: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth queries
export function meQuery() {
  return queryOptions({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      return apiFetch<{ user: User }>("/auth/me");
    },
    retry: false,
  });
}

// Project queries
export function projectListQuery(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;

  return queryOptions({
    queryKey: queryKeys.projectList({ page, limit }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      return apiFetch<{ projects: Project[]; pagination: Pagination }>(
        `/projects?${searchParams}`
      );
    },
  });
}

export function projectDetailQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.projectDetail(id),
    queryFn: async () => {
      return apiFetch<{ project: Project & { owner: User; counts: Record<string, number> } }>(
        `/projects/${id}`
      );
    },
  });
}

// Element queries
export function elementListQuery(projectId: string, params: { page?: number } = {}) {
  const { page = 1 } = params;

  return queryOptions({
    queryKey: queryKeys.elementList(projectId, { page }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ page: String(page) });
      return apiFetch<{ elements: Element[]; pagination: Pagination }>(
        `/projects/${projectId}/elements?${searchParams}`
      );
    },
  });
}

// Edit queries
export function editListQuery(
  projectId: string,
  params: { page?: number; status?: string } = {}
) {
  const { page = 1, status } = params;

  return queryOptions({
    queryKey: queryKeys.editList(projectId, { page, status }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ page: String(page) });
      if (status) searchParams.set("status", status);
      return apiFetch<{ edits: any[]; pagination: Pagination }>(
        `/projects/${projectId}/edits?${searchParams}`
      );
    },
  });
}

// Analysis queries
export function analysisStatusQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.analysis(projectId),
    queryFn: async () => {
      return apiFetch<{
        projectStatus: string;
        lastAnalyzedAt: string | null;
        lastError: string | null;
        currentJob: any;
      }>(`/projects/${projectId}/analysis/status`);
    },
    refetchInterval: (query) => {
      // Poll every 2s while analyzing
      const status = query.state.data?.projectStatus;
      return status === "analyzing" ? 2000 : false;
    },
  });
}
