import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { useDisconnectGitHub } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    github: search.github as string | undefined,
    error: search.error as string | undefined,
  }),
});

function SettingsPage() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const search = useSearch({ from: "/dashboard/settings" });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: orgData, isLoading: orgLoading, refetch } = useQuery(currentOrgQuery());
  const disconnectGitHub = useDisconnectGitHub(orgData?.organization?.id || "");

  // Show success message when GitHub is connected
  useEffect(() => {
    if (search.github === "connected") {
      setShowSuccessMessage(true);
      refetch();
      window.history.replaceState({}, "", "/dashboard/settings");
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [search.github, refetch]);

  const handleConnectGitHub = async () => {
    if (!orgData?.organization?.id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/organizations/${orgData.organization.id}/github/connect`,
        { credentials: "include" }
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
    if (
      confirm(
        "Are you sure you want to disconnect GitHub? This will affect all projects in this organization."
      )
    ) {
      disconnectGitHub.mutate();
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Manage your organization and integrations.</p>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5" />
            <span>GitHub connected successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {search.error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <div className="flex items-center gap-2">
            <XIcon className="w-5 h-5" />
            <span>Failed to connect GitHub: {search.error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Organization */}
        <section className="border border-white/10 rounded-lg bg-[#111]">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">Organization</h2>
          </div>
          <div className="p-6">
            {organization ? (
              <div className="flex items-center gap-4">
                <img
                  src={organization.imageUrl}
                  alt={organization.name}
                  className="w-12 h-12 rounded-lg"
                />
                <div>
                  <p className="font-medium">{organization.name}</p>
                  <p className="text-sm text-gray-500">
                    {orgData?.organization?.memberCount || 0} members ·{" "}
                    {orgData?.organization?.projectCount || 0} projects
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No organization selected</p>
            )}
          </div>
        </section>

        {/* GitHub Integration */}
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
                    <GitHubIcon className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub Connected</p>
                      <p className="text-sm text-gray-500">
                        @{orgData.organization.githubOrgName}
                      </p>
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
                <p className="text-sm text-gray-400">
                  Connect your GitHub account to enable repository access for all projects in this
                  organization.
                </p>
                <Button onClick={handleConnectGitHub}>
                  <GitHubIcon className="w-4 h-4 mr-2" />
                  Connect GitHub
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Profile */}
        <section className="border border-white/10 rounded-lg bg-[#111]">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-medium">
                  {user?.firstName?.[0] || "U"}
                </div>
              )}
              <div>
                <p className="font-medium">{user?.fullName || "User"}</p>
                <p className="text-sm text-gray-500">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
