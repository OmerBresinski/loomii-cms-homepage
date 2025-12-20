import { useOrganization, useUser, useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { currentOrgQuery } from "@/lib/queries";
import { useDisconnectGitHub } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization and integrations.</p>
      </div>

      {showSuccessMessage && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="py-4 flex items-center gap-2 text-emerald-500">
            <Check className="w-5 h-5" />
            <span>GitHub connected successfully!</span>
          </CardContent>
        </Card>
      )}

      {search?.error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="py-4 flex items-center gap-2 text-destructive">
            <X className="w-5 h-5" />
            <span>Failed to connect GitHub: {search.error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {organization ? (
            <div className="flex items-center gap-4">
              <img src={organization.imageUrl} alt={organization.name} className="w-12 h-12 rounded-lg" />
              <div>
                <p className="font-medium">{organization.name}</p>
                <p className="text-sm text-muted-foreground">
                  {orgData?.organization?.memberCount || 0} members · {orgData?.organization?.projectCount || 0} projects
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No organization selected</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
        </CardHeader>
        <CardContent>
          {orgLoading ? (
            <div className="animate-pulse h-16 bg-muted rounded-lg" />
          ) : orgData?.organization?.hasGitHubConnected ? (
            <div className="space-y-4">
              <Card className="bg-secondary">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Github className="w-8 h-8" />
                    <div>
                      <p className="font-medium">GitHub Connected</p>
                      <p className="text-sm text-muted-foreground">@{orgData.organization.githubOrgName}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </CardContent>
              </Card>
              <Button
                variant="outline"
                onClick={handleDisconnectGitHub}
                disabled={disconnectGitHub.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {disconnectGitHub.isPending ? "Disconnecting..." : "Disconnect GitHub"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Connect your GitHub account to enable repository access.</p>
              <Button onClick={handleConnectGitHub}>
                <Github className="w-4 h-4 mr-2" />
                Connect GitHub
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
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
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
