import { Link, Outlet } from "@tanstack/react-router";
import { useOrganization } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout() {
  const { organization } = useOrganization();
  const { data: orgData } = useQuery(currentOrgQuery());

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>

        <div className="flex flex-col flex-1 min-w-0">
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
      </SidebarInset>
    </SidebarProvider>
  );
}
