import { useNavigate, Link } from "@tanstack/react-router";
import {
  useAuth,
  useOrganization,
  useOrganizationList,
  CreateOrganization,
} from "@clerk/clerk-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: membershipsLoaded, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const hasOrganizations = useMemo(() => {
    return (userMemberships?.data?.length ?? 0) > 0;
  }, [userMemberships?.data]);

  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      navigate({ to: "/" });
    }
  }, [authLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!organization || syncingRef.current) return;
    
    syncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    
    apiFetch<{ organization: { id: string } }>("/organizations/sync", {
      method: "POST",
      body: JSON.stringify({
        clerkOrgId: organization.id,
        name: organization.name,
        slug: organization.slug || organization.id,
        logoUrl: organization.imageUrl,
      }),
    })
      .then(() => {
        navigate({ to: "/dashboard" });
      })
      .catch((error) => {
        console.error("Failed to sync organization:", error);
        setSyncError(error.message || "Failed to sync organization");
        setIsSyncing(false);
        syncingRef.current = false;
      });
  }, [organization, navigate]);

  if (!authLoaded || !orgLoaded || !membershipsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-destructive mb-4">{syncError}</p>
            <Button
              variant="ghost"
              onClick={() => {
                syncingRef.current = false;
                setSyncError(null);
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCreateOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setShowCreateOrg(false)}
            className="mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <CreateOrganization afterCreateOrganizationUrl="/onboarding" skipInvitationScreen={true} />
        </div>
      </div>
    );
  }

  const handleSelectOrg = async (orgId: string) => {
    if (setActive) {
      await setActive({ organization: orgId });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">L</span>
            </div>
            <span>Loomii</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Loomii</CardTitle>
            <CardDescription>
              {hasOrganizations
                ? "Select an organization to continue, or create a new one."
                : "Create your first organization to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasOrganizations && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">Your organizations</p>
                {userMemberships?.data?.map((membership) => (
                  <button
                    key={membership.organization.id}
                    onClick={() => handleSelectOrg(membership.organization.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-lg",
                      "border border-border bg-secondary",
                      "hover:bg-accent",
                      "transition-all text-left"
                    )}
                  >
                    <img
                      src={membership.organization.imageUrl}
                      alt={membership.organization.name}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{membership.organization.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{membership.role}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {hasOrganizations && (
              <div className="relative py-2">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 text-xs text-muted-foreground bg-card">or</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setShowCreateOrg(true)}
              variant={hasOrganizations ? "outline" : "default"}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create new organization
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
