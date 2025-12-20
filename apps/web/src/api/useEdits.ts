import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, Pagination } from "./common";

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
