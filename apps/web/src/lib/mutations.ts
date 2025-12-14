import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { queryKeys } from "./queries";

// Sync organization mutation
export function useSyncOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clerkOrgId: string;
      name: string;
      slug: string;
      logoUrl?: string;
    }) => {
      return apiFetch<{
        organization: {
          id: string;
          clerkOrgId: string;
          name: string;
          slug: string;
        };
      }>("/organizations/sync", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization() });
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}

// Disconnect GitHub from organization
export function useDisconnectGitHub(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean }>(`/organizations/${orgId}/github`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentOrg() });
    },
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      githubRepo: string;
      githubBranch?: string;
      deploymentUrl: string;
    }) => {
      return apiFetch<{ project: { id: string; name: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

// Update project mutation
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; githubBranch?: string; deploymentUrl?: string }) => {
      return apiFetch<{ project: any }>(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      return apiFetch<{ success: boolean }>(`/projects/${projectId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

// Create edit mutation
export function useCreateEdit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { elementId: string; newValue: string }) => {
      return apiFetch<{ edit: { id: string } }>(`/projects/${projectId}/edits`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.edits(projectId) });
    },
  });
}

// Submit edits mutation (creates PR)
export function useSubmitEdits(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { editIds: string[]; prTitle?: string; prDescription?: string }) => {
      return apiFetch<{
        pullRequest: {
          id: string;
          githubPrNumber: number;
          githubPrUrl: string;
        };
      }>(`/projects/${projectId}/edits/submit`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.edits(projectId) });
    },
  });
}

// Trigger analysis mutation
export function useTriggerAnalysis(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { fullRescan?: boolean } = {}) => {
      return apiFetch<{ jobId: string; status: string }>(`/projects/${projectId}/analysis/trigger`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(projectId) });
    },
  });
}

// Logout mutation
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });
}
