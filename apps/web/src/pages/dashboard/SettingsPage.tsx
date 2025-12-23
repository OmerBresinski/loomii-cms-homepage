import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useOrganization, OrganizationProfile, UserProfile } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import {
  IconBrandGithub,
  IconBuilding,
  IconUser,
  IconPlug,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SettingsTab = "integrations" | "organization" | "account";

export function SettingsPage() {
  const { organization } = useOrganization();
  const { data: orgData, isLoading } = useQuery(currentOrgQuery());
  const search = useSearch({ from: "/dashboard/settings" });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations");

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  useEffect(() => {
    if (search.github === "success") {
      toast.success("GitHub account connected successfully!");
      navigate({ from: "/dashboard/settings", search: (prev: any) => ({ ...prev, github: undefined, error: undefined }) as any });
    } else if (search.error) {
      toast.error(`Connection failed: ${search.error}`);
      navigate({ from: "/dashboard/settings", search: (prev: any) => ({ ...prev, github: undefined, error: undefined }) as any });
    }
  }, [search.github, search.error, navigate]);

  const handleConnectGitHub = async () => {
    if (!orgData?.organization?.id) {
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

  if (!organization) return null;

  const tabs = [
    { id: "integrations" as const, label: "Integrations", icon: IconPlug },
    { id: "organization" as const, label: "Organization", icon: IconBuilding },
    { id: "account" as const, label: "Account", icon: IconUser },
  ];

  const clerkAppearance = {
    baseTheme: dark,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-title">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage integrations and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "integrations" && (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-[#24292f] flex items-center justify-center shrink-0">
                  <IconBrandGithub className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">GitHub</span>
                    {isLoading ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <IconRefresh className="w-3 h-3 animate-spin" />
                        Checking...
                      </Badge>
                    ) : hasGitHub ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <IconCheck className="w-3 h-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1 text-[10px]">
                        <IconAlertCircle className="w-3 h-3" />
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sync repositories and create pull requests
                  </p>
                </div>
                {hasGitHub ? (
                  <Button variant="outline" size="sm" disabled className="opacity-50">
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleConnectGitHub}>
                    <IconBrandGithub className="w-4 h-4 mr-1.5" />
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "organization" && (
          <OrganizationProfile
            appearance={clerkAppearance}
            routing="hash"
          />
        )}

        {activeTab === "account" && (
          <UserProfile
            appearance={clerkAppearance}
            routing="hash"
          />
        )}
      </div>
    </div>
  );
}
