import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { currentOrgQuery } from "@/lib/queries";
import { useDisconnectGitHub } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Github, Check, X } from "lucide-react";

export function SettingsPage() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const search = useSearch({ strict: false }) as { github?: string; error?: string };
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: orgData, isLoading: orgLoading, refetch } = useQuery(currentOrgQuery());
  const disconnectGitHub = useDisconnectGitHub(orgData?.organization?.id || "");

  useEffect(() => {
    if (search?.github === "connected") {
      setShowSuccessMessage(true);
      refetch();
      window.history.replaceState({}, "", "/dashboard/settings");
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [search?.github, refetch]);

  const handleConnectGitHub = async () => {
    if (!orgData?.organization?.id) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/organizations/${orgData.organization.id}/github/connect`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to initiate GitHub connection:", error);
    }
  };

  const handleDisconnectGitHub = () => {
    if (confirm("Are you sure you want to disconnect GitHub? This will affect all projects.")) {
      disconnectGitHub.mutate();
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Manage your organization and integrations.</p>
      </div>

      {showSuccessMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>GitHub connected successfully!</span>
          </div>
        </div>
      )}

      {search?.error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5" />
            <span>Failed to connect GitHub: {search.error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <section className="border border-white/10 rounded-lg bg-[#111]">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">Organization</h2>
          </div>
          <div className="p-6">
            {organization ? (
              <div className="flex items-center gap-4">
                <img src={organization.imageUrl} alt={organization.name} className="w-12 h-12 rounded-lg" />
                <div>
                  <p className="font-medium">{organization.name}</p>
                  <p className="text-sm text-gray-500">
                    {orgData?.organization?.memberCount || 0} members · {orgData?.organization?.projectCount || 0} projects
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No organization selected</p>
            )}
          </div>
        </section>

        <section className="border border-white/10 rounded-lg bg-[#111]">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">GitHub Integration</h2>
          </div>
          <div className="p-6">
            {orgLoading ? (
              <div className="animate-pulse h-16 bg-white/5 rounded-lg" />
            ) : orgData?.organization?.hasGitHubConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center gap-3">
                    <Github className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub Connected</p>
                      <p className="text-sm text-gray-500">@{orgData.organization.githubOrgName}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnectGitHub}
                  disabled={disconnectGitHub.isPending}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  {disconnectGitHub.isPending ? "Disconnecting..." : "Disconnect GitHub"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Connect your GitHub account to enable repository access.</p>
                <Button onClick={handleConnectGitHub}>
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="border border-white/10 rounded-lg bg-[#111]">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName || "User"} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-medium">
                  {user?.firstName?.[0] || "U"}
                </div>
              )}
              <div>
                <p className="font-medium">{user?.fullName || "User"}</p>
                <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

