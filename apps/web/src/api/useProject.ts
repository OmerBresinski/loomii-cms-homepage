import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, Project, Pagination, User } from "./common";

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
