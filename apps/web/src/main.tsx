import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";

import { createAppRouter } from "./router";
import { setAuthTokenGetter } from "./lib/api";
import "./styles/globals.css";

// Clerk publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables");
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// Create the router instance
const router = createAppRouter(queryClient);

// Component to set up auth token for API calls
function AuthTokenSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  // Set the token getter for API calls
  React.useEffect(() => {
    setAuthTokenGetter(async () => {
      return getToken();
    });
  }, [getToken]);

  return <>{children}</>;
}

// Render the app
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <AuthTokenSetup>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AuthTokenSetup>
      </ClerkProvider>
    </React.StrictMode>
  );
}
