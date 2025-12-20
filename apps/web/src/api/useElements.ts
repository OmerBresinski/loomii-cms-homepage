import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, Element, Pagination } from "./common";

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
