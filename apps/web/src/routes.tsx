import { createRouter, createRoute, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

// Import page components
import { RootLayout } from "@/pages/RootLayout";
import { HomePage } from "@/pages/HomePage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardLayout } from "@/pages/dashboard/DashboardLayout";
import { DashboardHome } from "@/pages/dashboard/DashboardHome";
import { SettingsPage } from "@/pages/dashboard/SettingsPage";
import { ProjectsPage } from "@/pages/dashboard/projects/ProjectsPage";
import { NewProjectPage } from "@/pages/dashboard/projects/NewProjectPage";
import { ProjectDetailPage } from "@/pages/dashboard/projects/ProjectDetailPage";

// Router context type
interface RouterContext {
  queryClient: QueryClient;
}

// Root route
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

// Public routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

// Dashboard layout route
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardLayout,
});

// Dashboard child routes
const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/",
  component: DashboardHome,
});

const settingsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/settings",
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    github: search.github as string | undefined,
    error: search.error as string | undefined,
  }),
});

const projectsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/projects",
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "/",
  component: ProjectsPage,
});

const newProjectRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "/new",
  component: NewProjectPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "/$projectId",
  component: ProjectDetailPage,
});

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    settingsRoute,
    projectsRoute.addChildren([
      projectsIndexRoute,
      newProjectRoute,
      projectDetailRoute,
    ]),
  ]),
]);

// Create router
export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
}

// Type declaration for router
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

