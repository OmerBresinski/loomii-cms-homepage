import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "./common";

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
    refetchInterval: (query: any) => {
      // Poll every 2s while analyzing
      const status = query.state.data?.projectStatus;
      return status === "analyzing" ? 2000 : false;
    },
  });
}
