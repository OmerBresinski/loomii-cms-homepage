import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, Section, SectionWithElements } from "./common";

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
