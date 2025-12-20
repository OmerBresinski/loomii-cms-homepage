import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./api";

// Query keys
export const queryKeys = {
  all: ["ai-cms"] as const,
  auth: () => [...queryKeys.all, "auth"] as const,
  me: () => [...queryKeys.auth(), "me"] as const,
  organization: () => [...queryKeys.all, "organization"] as const,
  currentOrg: () => [...queryKeys.organization(), "current"] as const,
  orgRepos: (orgId: string) =>
    [...queryKeys.organization(), orgId, "repos"] as const,
  repoFolders: (orgId: string, repo: string, branch: string) =>
    [
      ...queryKeys.organization(),
      orgId,
      "repos",
      repo,
      "folders",
      branch,
    ] as const,
  orgMembers: (orgId: string) =>
    [...queryKeys.organization(), orgId, "members"] as const,
  projects: () => [...queryKeys.all, "projects"] as const,
  projectList: (params: { page?: number; limit?: number }) =>
    [...queryKeys.projects(), "list", params] as const,
  projectDetail: (id: string) =>
    [...queryKeys.projects(), "detail", id] as const,
  elements: (projectId: string) =>
    [...queryKeys.all, "elements", projectId] as const,
  elementList: (projectId: string, params: { page?: number; limit?: number }) =>
    [...queryKeys.elements(projectId), "list", params] as const,
  sections: (projectId: string) =>
    [...queryKeys.all, "sections", projectId] as const,
  sectionList: (projectId: string) =>
    [...queryKeys.sections(projectId), "list"] as const,
  sectionDetail: (projectId: string, sectionId: string) =>
    [...queryKeys.sections(projectId), "detail", sectionId] as const,
  edits: (projectId: string) => [...queryKeys.all, "edits", projectId] as const,
  editList: (projectId: string, params: { page?: number; status?: string }) =>
    [...queryKeys.edits(projectId), "list", params] as const,
  analysis: (projectId: string) =>
    [...queryKeys.all, "analysis", projectId] as const,
} as const;

// Types
interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Organization {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  hasGitHubConnected: boolean;
  githubOrgName: string | null;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  hasGitHubConnected: boolean;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  url: string;
  updatedAt: string;
}

interface RepoFolder {
  path: string;
  name: string;
  depth: number;
}

interface OrgMember {
  id: string;
  user: User;
  role: "owner" | "admin" | "member";
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  githubRepo: string;
  githubBranch: string;
  rootPath: string;
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
  sourceFile: string | null;
  sourceLine: number | null;
  currentValue: string | null;
  pageUrl: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  name: string;
  description: string | null;
  sourceFile: string | null;
  startLine: number | null;
  endLine: number | null;
  elementCount: number;
  createdAt: string;
}

interface SectionWithElements extends Section {
  elements: Element[];
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
      return apiFetch<{ user: User; organization: OrganizationContext | null }>(
        "/auth/me"
      );
    },
    retry: false,
  });
}

// Organization queries
export function currentOrgQuery() {
  return queryOptions({
    queryKey: queryKeys.currentOrg(),
    queryFn: async () => {
      return apiFetch<{
        organization: Organization | null;
        needsSync?: boolean;
      }>("/organizations/current");
    },
    retry: false,
  });
}

export function orgReposQuery(orgId: string) {
  return queryOptions({
    queryKey: queryKeys.orgRepos(orgId),
    queryFn: async () => {
      return apiFetch<{ repos: GitHubRepo[] }>(
        `/organizations/${orgId}/github/repos`
      );
    },
    enabled: !!orgId,
  });
}

export function orgMembersQuery(orgId: string) {
  return queryOptions({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: async () => {
      return apiFetch<{ members: OrgMember[] }>(
        `/organizations/${orgId}/members`
      );
    },
    enabled: !!orgId,
  });
}

export function repoFoldersQuery(orgId: string, repo: string, branch: string) {
  const [owner, repoName] = repo.split("/");
  return queryOptions({
    queryKey: queryKeys.repoFolders(orgId, repo, branch),
    queryFn: async () => {
      return apiFetch<{ folders: RepoFolder[] }>(
        `/organizations/${orgId}/github/repos/${owner}/${repoName}/folders?branch=${branch}`
      );
    },
    enabled: !!orgId && !!repo && !!branch,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Project queries
export function projectListQuery(
  params: { page?: number; limit?: number } = {}
) {
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
      return apiFetch<{
        project: Project & { owner: User; counts: Record<string, number> };
      }>(`/projects/${id}`);
    },
  });
}

// Element queries
export function elementListQuery(
  projectId: string,
  params: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 500 } = params;

  return queryOptions({
    queryKey: queryKeys.elementList(projectId, { page, limit }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      return apiFetch<{ elements: Element[]; pagination: Pagination }>(
        `/projects/${projectId}/elements?${searchParams}`
      );
    },
  });
}

// Section queries
export function sectionListQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.sectionList(projectId),
    queryFn: async () => {
      return apiFetch<{ sections: Section[] }>(
        `/projects/${projectId}/sections`
      );
    },
  });
}

export function sectionDetailQuery(projectId: string, sectionId: string) {
  return queryOptions({
    queryKey: queryKeys.sectionDetail(projectId, sectionId),
    queryFn: async () => {
      return apiFetch<{ section: SectionWithElements }>(
        `/projects/${projectId}/sections/${sectionId}`
      );
    },
    enabled: !!sectionId,
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

// Mutations
