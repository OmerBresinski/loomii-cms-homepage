import { Outlet } from "@tanstack/react-router";
import { useOrganization } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { Card, CardContent } from "@/ui/card";
import { SidebarProvider, SidebarInset } from "@/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { useEffect } from "react";
import { useSyncOrganization } from "@/lib/mutations";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export function DashboardLayout() {
  const { organization } = useOrganization();
  const { data: orgData } = useQuery(currentOrgQuery());
  const { mutate: syncOrg } = useSyncOrganization();

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  useEffect(() => {
    if (orgData?.needsSync && organization) {
      console.log("Syncing organization...", organization);
      syncOrg({
        clerkOrgId: organization.id,
        name: organization.name,
        slug: organization.slug || organization.id,
        logoUrl: organization.imageUrl,
      });
    }
  }, [orgData?.needsSync, organization, syncOrg]);

  const handleConnect = async () => {
    if (!orgData?.organization?.id) {
      console.error("Missing organization ID:", orgData);
      toast.error("Organization data not loaded. Please try again.");
      return;
    }
    try {
      const { url } = await apiFetch<{ url: string }>(`/organizations/${orgData.organization.id}/github/connect`);
      window.location.href = url;
    } catch (error) {
      console.error("GitHub connect error:", error);
      toast.error("Failed to initiate connection");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>

        <div className="flex flex-col flex-1 min-w-0">
          {!hasGitHub && organization && (
            <Card className="rounded-none border-x-0 border-t-0 bg-amber-500/10 border-amber-500/30">
              <CardContent className="py-3 px-6 flex items-center justify-between">
                <p className="text-sm text-amber-500">
                  <span className="font-medium">GitHub not connected.</span> Connect GitHub to start creating projects.
                </p>
                <button onClick={handleConnect} className="text-sm font-medium text-amber-500 hover:underline cursor-pointer bg-transparent border-none p-0">
                  Connect now →
                </button>
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
