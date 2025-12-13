import { hc } from "hono/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create a typed Hono client
// In a real app, we'd import the type from the API package
export const api = hc<any>(API_URL, {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

// Helper for making direct fetch calls
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
