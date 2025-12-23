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
    variables: {
      colorPrimary: "oklch(0.645 0.246 16.439)",
      colorDanger: "oklch(0.704 0.191 22.216)",
      colorSuccess: "oklch(0.696 0.17 162.48)",
      colorWarning: "oklch(0.769 0.188 70.08)",
      colorBackground: "oklch(0.216 0.006 56.043)",
      colorInputBackground: "oklch(0.268 0.007 34.298)",
      colorInputText: "oklch(0.985 0.001 106.423)",
      colorText: "oklch(0.985 0.001 106.423)",
      colorTextSecondary: "oklch(0.709 0.01 56.259)",
      borderRadius: "0.45rem",
      fontFamily: "'Geist Sans', sans-serif",
      fontSize: "14px",
    },
    elements: {
      // Root & Card
      rootBox: "w-full max-w-none",
      cardBox: "shadow-none border-0 bg-transparent p-0 w-full max-w-none",
      card: "shadow-none border-0 bg-transparent p-0 w-full max-w-none",

      // Navigation
      navbar: "hidden",
      navbarMobileMenuButton: "hidden",
      breadcrumbs: "hidden",

      // Headers
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      header: "hidden",

      // Page layout
      pageScrollBox: "p-0 w-full max-w-none",
      page: "gap-8 w-full max-w-none",

      // Profile sections
      profileSection: "gap-4 p-0",
      profileSectionTitle: "pb-2 border-b border-border/50",
      profileSectionTitleText: "text-sm font-semibold text-foreground uppercase tracking-wide",
      profileSectionSubtitle: "text-muted-foreground text-sm",
      profileSectionContent: "gap-3 pt-4",
      profileSectionPrimaryButton: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium",

      // Profile page specific
      profilePage: "p-0 gap-8",

      // Accordion (expandable sections)
      accordionTriggerButton: "hover:bg-muted/50 rounded-lg px-4 py-3 border border-border/50 bg-card/50",
      accordionContent: "px-4 py-4 border border-t-0 border-border/50 rounded-b-lg bg-card/30",

      // Form elements
      formFieldLabel: "text-sm font-medium text-foreground mb-1.5",
      formFieldInput: "bg-muted/30 border-border/50 text-foreground rounded-lg h-10 px-3 focus:border-primary focus:ring-1 focus:ring-primary/20",
      formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
      formFieldHintText: "text-muted-foreground text-xs mt-1",
      formFieldErrorText: "text-destructive text-xs mt-1",
      formFieldWarningText: "text-amber-500 text-xs mt-1",
      formFieldSuccessText: "text-emerald-500 text-xs mt-1",

      // Buttons
      formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium h-10 px-4",
      formButtonReset: "text-muted-foreground hover:text-foreground",
      buttonArrowIcon: "text-primary-foreground",

      // User/Org buttons and items
      userButtonBox: "rounded-lg",
      userButtonTrigger: "rounded-lg",
      userButtonAvatarBox: "rounded-lg",
      organizationSwitcherTrigger: "rounded-lg",

      // Avatars
      avatarBox: "rounded-lg border border-border/30",
      avatarImage: "rounded-lg",

      // Badges
      badge: "bg-primary/10 text-primary border-0 rounded-md text-xs font-medium px-2 py-0.5",

      // Tables & Lists
      tableHead: "text-muted-foreground text-xs font-semibold uppercase tracking-wide border-b border-border/50 pb-3",
      tableRow: "border-b border-border/30",

      // Members list
      membersPageInviteButton: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg",
      membersList: "gap-2",
      membersListItem: "p-3 rounded-lg hover:bg-muted/30 border border-transparent hover:border-border/50 transition-all",
      membersListItemActions: "gap-2",

      // Invitations
      inviteMembersFormButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg",

      // Modals & Popovers (for nested modals)
      modalBackdrop: "bg-background/80 backdrop-blur-sm",
      modalContent: "bg-card border border-border rounded-xl shadow-2xl",
      modalCloseButton: "text-muted-foreground hover:text-foreground",

      // Action cards
      actionCard: "border border-border/50 rounded-lg p-4 hover:bg-muted/20 transition-colors",

      // Destructive actions
      formFieldAction__danger: "text-destructive hover:text-destructive/80",

      // Footer
      footer: "hidden",
      footerAction: "hidden",
      footerActionLink: "text-primary hover:text-primary/80",

      // Powered by Clerk badge
      internal: "hidden",

      // Scrollbar
      scrollBox: "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",

      // Active states
      navbarButton__active: "bg-primary/10 text-primary",

      // Select/Dropdown
      selectButton: "bg-muted/30 border-border/50 rounded-lg h-10",
      selectOptionsContainer: "bg-card border border-border rounded-lg shadow-xl",
      selectOption: "hover:bg-muted/50 px-3 py-2",

      // Phone input
      phoneInputBox: "bg-muted/30 border-border/50 rounded-lg",

      // Verification
      otpCodeFieldInput: "bg-muted/30 border-border/50 rounded-lg text-center font-mono",

      // Alert
      alert: "bg-muted/30 border border-border/50 rounded-lg p-4",
      alertText: "text-foreground text-sm",

      // Identity preview
      identityPreview: "bg-muted/30 border border-border/50 rounded-lg p-3",
      identityPreviewText: "text-foreground font-medium",
      identityPreviewEditButton: "text-primary hover:text-primary/80 text-sm",
    },
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
          <div className="[&_.cl-profilePage]:p-0">
            <OrganizationProfile
              appearance={clerkAppearance}
              routing="hash"
            />
          </div>
        )}

        {activeTab === "account" && (
          <div className="[&_.cl-profilePage]:p-0">
            <UserProfile
              appearance={clerkAppearance}
              routing="hash"
            />
          </div>
        )}
      </div>
    </div>
  );
}
