import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useOrganization, useUser, UserButton, OrganizationSwitcher } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Home, Folder, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { Card, CardContent } from "@/components/ui/card";

export function DashboardLayout() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { data: orgData } = useQuery(currentOrgQuery());
  const location = useLocation();

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: Home, exact: true },
    { to: "/dashboard/projects", label: "Projects", icon: Folder },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 px-6 flex items-center">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">L</span>
            </div>
            <span>Loomii</span>
          </Link>
        </div>

        <Separator />

        <div className="px-4 py-4">
          <OrganizationSwitcher
            afterCreateOrganizationUrl="/onboarding"
            afterSelectOrganizationUrl="/dashboard"
            afterLeaveOrganizationUrl="/onboarding"
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-secondary border border-border",
                  "hover:bg-accent",
                  "transition-all text-sm"
                ),
              },
            }}
          />
        </div>

        <Separator />

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.label === "Settings" && !hasGitHub && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="p-4">
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!hasGitHub && organization && (
          <Card className="rounded-none border-x-0 border-t-0 bg-amber-500/10 border-amber-500/30">
            <CardContent className="py-3 px-6 flex items-center justify-between">
              <p className="text-sm text-amber-500">
                <span className="font-medium">GitHub not connected.</span> Connect GitHub to start creating projects.
              </p>
              <Link to="/dashboard/settings" search={{ github: undefined, error: undefined }} className="text-sm font-medium text-amber-500 hover:underline">
                Connect now →
              </Link>
            </CardContent>
          </Card>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
