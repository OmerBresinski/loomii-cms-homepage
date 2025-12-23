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

// Submit edits mutation (creates PR from existing Edit records)
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

// Publish edits mutation (creates Edit records + PR in one call)
// This is the main mutation for the Review page "Publish" button
export function usePublishEdits(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      edits: Array<{
        elementId: string;
        originalValue: string;
        newValue: string;
        originalHref?: string;
        newHref?: string;
      }>;
    }) => {
      return apiFetch<{
        pullRequest: {
          id: string;
          githubPrNumber: number;
          githubPrUrl: string;
          title: string;
          branchName: string;
          status: string;
          editCount: number;
          createdAt: string;
        };
      }>(`/projects/${projectId}/edits/publish`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.edits(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
    },
  });
}

// Update element mutation (e.g. visibility)
export function useUpdateElement(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ elementId, ...data }: { elementId: string; [key: string]: any }) => {
      return apiFetch<{ success: boolean }>(`/projects/${projectId}/elements/${elementId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sections(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.elements(projectId) });
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

// Cancel analysis mutation
export function useCancelAnalysis(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean; jobId: string }>(`/projects/${projectId}/analysis/cancel`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
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
