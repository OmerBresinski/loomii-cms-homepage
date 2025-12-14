import { hc } from "hono/client";
// Type import from the API package - provides full type safety for RPC calls
// If the import fails during initial build, the client still works with `any`
import type { AppType } from "@ai-cms/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Function to get auth token from Clerk - will be set by the app
let getToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getToken = getter;
}

// Create headers with auth token
async function createAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (getToken) {
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

// Create a typed Hono client
export const api = hc<AppType>(API_URL, {
  fetch: async (input, init) => {
    const authHeaders = await createAuthHeaders();
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: {
        ...authHeaders,
        ...init?.headers,
      },
    });
  },
});

// Helper for making direct fetch calls (for cases where RPC doesn't work well)
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await createAuthHeaders();
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
