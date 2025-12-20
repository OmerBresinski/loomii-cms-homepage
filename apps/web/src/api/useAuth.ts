import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys, User, OrganizationContext } from "./common";

export function meQuery() {
  return queryOptions({
    queryKey: queryKeys.me(),
    queryFn: async () => {
      return apiFetch<{ user: User; organization: OrganizationContext | null }>(
        "/auth/me"
      );
    },
    retry: false,
  });
}
