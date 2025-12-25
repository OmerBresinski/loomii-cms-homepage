import { useUser, useOrganizationList, CreateOrganization } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";
import { IconArrowRight } from "@tabler/icons-react";

const clerkAppearance = {
  baseTheme: dark,
  elements: {
    rootBox: "w-full bg-transparent",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full shadow-none p-0 bg-transparent",
    main: "bg-transparent",
    form: "bg-transparent",
    formContainer: "bg-transparent",
    header: "hidden",
    footer: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    formFieldLabel: "text-zinc-400 text-xs font-medium mb-1.5",
    formFieldInput:
      "bg-zinc-800/50 border-zinc-700/50 text-zinc-100 focus:border-zinc-500 focus:ring-0 rounded-lg h-10 text-sm placeholder:text-zinc-500",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg h-10 text-sm",
  },
};

const clerkHideStyles = `
  .cl-internal-b3fm6y,
  .cl-footerAction,
  .cl-footer,
  .cl-badge,
  .cl-logoBox,
  .cl-headerTitle,
  .cl-headerSubtitle {
    display: none !important;
  }
  .cl-rootBox,
  .cl-cardBox,
  .cl-card,
  .cl-main,
  .cl-form,
  .cl-formContainer {
    background: transparent !important;
    background-color: transparent !important;
  }
  .cl-formButtonPrimary {
    background: #f43f5e !important;
    color: white !important;
    border: none !important;
    border-width: 0 !important;
    outline: none !important;
    box-shadow: none !important;
    width: 100% !important;
  }
  .cl-formButtonPrimary:hover {
    background: #e11d48 !important;
    border: none !important;
    box-shadow: none !important;
  }
  .cl-formButtonPrimary:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
`;

export function OnboardingPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { userMemberships, isLoaded: orgsLoaded, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSelectOrg = async (orgId: string) => {
    setIsSyncing(true);
    try {
      const org = userMemberships.data?.find((o) => o.organization.id === orgId)?.organization;
      if (!org) return;

      await apiFetch<{ organization: { id: string } }>("/organizations/sync", {
        method: "POST",
        body: JSON.stringify({
          clerkOrgId: org.id,
          name: org.name,
          slug: org.slug || org.id,
          logoUrl: org.imageUrl,
        }),
      });

      if (setActive) {
        await setActive({ organization: orgId });
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Failed to sync organization:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!userLoaded || !orgsLoaded || isSyncing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner className="size-6 text-primary" />
          <p className="text-sm text-zinc-500">Setting things up...</p>
        </div>
      </div>
    );
  }

  const hasOrgs = (userMemberships?.data || []).length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <style>{clerkHideStyles}</style>
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground text-lg font-bold">L</span>
          </div>
          <span className="text-xl font-semibold text-zinc-100">Loomii</span>
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-0 text-[10px] px-1.5">
            Beta
          </Badge>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-zinc-100 mb-1">
              {hasOrgs ? "Select workspace" : "Create workspace"}
            </h1>
            <p className="text-sm text-zinc-500">
              {hasOrgs ? "Choose an organization to continue" : "Set up your first organization"}
            </p>
          </div>

          {/* Existing Organizations */}
          {hasOrgs && (
            <div className="space-y-2 mb-6">
              {(userMemberships.data || []).map((membership) => (
                <button
                  key={membership.organization.id}
                  onClick={() => handleSelectOrg(membership.organization.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {membership.organization.imageUrl ? (
                      <img src={membership.organization.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-zinc-300">
                        {membership.organization.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-zinc-100">{membership.organization.name}</p>
                    <p className="text-xs text-zinc-500">
                      {membership.role === "org:admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                  <IconArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {hasOrgs && (
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px bg-zinc-800 flex-1" />
              <span className="text-xs text-zinc-600">or create new</span>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>
          )}

          {/* Create Organization */}
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard"
            appearance={clerkAppearance}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-600">
            Signed in as {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>
    </div>
  );
}
