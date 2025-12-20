import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, Organization, GitHubRepo, OrgMember, RepoFolder } from "./common";

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
    staleTime: 5 * 60 * 1000,
  });
}
