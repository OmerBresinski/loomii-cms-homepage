import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useOrganization, useUser, UserButton, OrganizationSwitcher } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { data: orgData } = useQuery(currentOrgQuery());
  const location = useLocation();

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: HomeIcon, exact: true },
    { to: "/dashboard/projects", label: "Projects", icon: FolderIcon },
    { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span>Loomii</span>
          </Link>
        </div>

        {/* Org Switcher */}
        <div className="px-4 py-4 border-b border-white/10">
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
                  "bg-white/5 border border-white/10",
                  "hover:bg-white/10 hover:border-white/20",
                  "transition-all text-sm"
                ),
              },
            }}
          />
        </div>

        {/* Navigation */}
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
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
              <p className="text-xs text-gray-500 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* GitHub Warning Banner */}
        {!hasGitHub && organization && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-500">
                <span className="font-medium">GitHub not connected.</span>{" "}
                Connect GitHub to start creating projects.
              </p>
              <Link
                to="/dashboard/settings"
                className="text-sm font-medium text-amber-500 hover:underline"
              >
                Connect now →
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
