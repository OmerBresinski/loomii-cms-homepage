import { Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  useOrganization,
} from "@clerk/clerk-react";
import { useEffect } from "react";

export function RootLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isOnboarding = location.pathname === "/onboarding";

  if (isDashboard) {
    return (
      <>
        <SignedIn>
          <OrgCheckWrapper>
            <Outlet />
          </OrgCheckWrapper>
        </SignedIn>
        <SignedOut>
          <Outlet />
        </SignedOut>
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </>
    );
  }

  if (isOnboarding) {
    return (
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span>Loomii</span>
          </Link>

          <div className="flex items-center gap-4">
            <SignedIn>
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/80 transition-colors"
              >
                Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/80 transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  );
}

function OrgCheckWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const location = useLocation();

  useEffect(() => {
    if (isLoaded && orgLoaded && !organization && location.pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [isLoaded, orgLoaded, organization, location.pathname, navigate]);

  return <>{children}</>;
}

