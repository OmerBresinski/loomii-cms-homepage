import { Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { SignedIn, SignedOut, SignInButton, useAuth, useOrganization } from "@clerk/clerk-react";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/ui/sonner";

export function RootLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isOnboarding = location.pathname === "/onboarding";
  const isHomePage = location.pathname === "/";

  const content = () => {
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
        </>
      );
    }

    if (isOnboarding || isHomePage) {
      return <Outlet />;
    }

    return (
      <div className="min-h-screen">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
            >
              <img src="/loomii-black-pink.png" alt="Loomii" className="w-7 h-7" />
              <span className="tracking-tight">Loomii</span>
            </Link>

            <div className="flex items-center gap-4">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
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
      </div>
    );
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {content()}
      <Toaster position="bottom-right" closeButton richColors />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </ThemeProvider>
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
