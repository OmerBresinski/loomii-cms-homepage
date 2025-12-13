import { hc } from "hono/client";
// Type import from the API package - provides full type safety for RPC calls
// If the import fails during initial build, the client still works with `any`
import type { AppType } from "@ai-cms/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create a typed Hono client
export const api = hc<AppType>(API_URL, {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

// Helper for making direct fetch calls (for cases where RPC doesn't work well)
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
