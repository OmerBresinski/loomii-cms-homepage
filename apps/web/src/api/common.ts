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

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Organization {
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

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  hasGitHubConnected: boolean;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  url: string;
  updatedAt: string;
}

export interface RepoFolder {
  path: string;
  name: string;
  depth: number;
}

export interface OrgMember {
  id: string;
  user: User;
  role: "owner" | "admin" | "member";
  createdAt: string;
}

export interface Project {
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

export interface Element {
  id: string;
  name: string;
  type: string;
  selector: string;
  sourceFile: string | null;
  sourceLine: number | null;
  currentValue: string | null;
  schema?: any;
  pageUrl: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  description: string | null;
  sourceFile: string | null;
  startLine: number | null;
  endLine: number | null;
  elementCount: number;
  createdAt: string;
}

export interface SectionWithElements extends Section {
  elements: Element[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
