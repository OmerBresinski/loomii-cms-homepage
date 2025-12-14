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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{syncError}</p>
          <button
            onClick={() => {
              syncingRef.current = false;
              setSyncError(null);
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (showCreateOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowCreateOrg(false)}
            className="mb-6 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <span>Loomii</span>
          </Link>
        </div>

        <div className="border border-white/10 rounded-lg bg-[#111] p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome to Loomii</h1>
            <p className="text-gray-400">
              {hasOrganizations
                ? "Select an organization to continue, or create a new one."
                : "Create your first organization to get started."}
            </p>
          </div>

          <div className="space-y-4">
            {hasOrganizations && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">Your organizations</p>
                {userMemberships?.data?.map((membership) => (
                  <button
                    key={membership.organization.id}
                    onClick={() => handleSelectOrg(membership.organization.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-lg",
                      "border border-white/10 bg-white/5",
                      "hover:bg-white/10 hover:border-white/20",
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
                      <p className="text-sm text-gray-500 capitalize">{membership.role}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {hasOrganizations && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-500 bg-[#111]">or</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCreateOrg(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg",
                "font-medium text-sm transition-all",
                hasOrganizations
                  ? "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create new organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

