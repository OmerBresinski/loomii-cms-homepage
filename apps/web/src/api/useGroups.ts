import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "./common";

interface AddItemParams {
  projectId: string;
  groupId: string;
  values: Record<string, string>;
  position?: number;
}

interface AddItemResponse {
  success: boolean;
  element: {
    id: string;
    groupIndex: number;
  };
  edit: {
    id: string;
    editType: string;
    newValue: string;
  };
}

export function useAddGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, groupId, values, position }: AddItemParams) => {
      return apiFetch<AddItemResponse>(
        `/projects/${projectId}/groups/${groupId}/items`,
        {
          method: "POST",
          body: JSON.stringify({ values, position }),
        }
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate ALL section queries for this project (including section details)
      // Using the base key with exact:false to match all queries starting with this prefix
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections(projectId),
      });
    },
  });
}

interface DeleteItemParams {
  projectId: string;
  groupId: string;
  elementId: string;
}

export function useDeleteGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, groupId, elementId }: DeleteItemParams) => {
      return apiFetch<{ success: boolean }>(
        `/projects/${projectId}/groups/${groupId}/items/${elementId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate ALL section queries for this project (including section details)
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections(projectId),
      });
    },
  });
}
