import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

import { createAppRouter } from "./routes";
import { setAuthTokenGetter } from "./lib/api";
import "./index.css";

// Clerk publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables");
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: true,
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
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        appearance={{ baseTheme: dark }}
      >
        <AuthTokenSetup>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </AuthTokenSetup>
      </ClerkProvider>
    </React.StrictMode>
  );
}
