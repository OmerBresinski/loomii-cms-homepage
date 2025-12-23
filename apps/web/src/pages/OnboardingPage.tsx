import { useUser, useOrganizationList, CreateOrganization } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions } from "@/ui/item";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/ui/empty";
import { IconBuilding, IconArrowRight, IconLoader2, IconSparkles } from "@tabler/icons-react";

export function OnboardingPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { userMemberships, isLoaded: orgsLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);



    const handleSelectOrg = async (orgId: string) => {
    setIsSyncing(true);
    try {
      const org = userMemberships.data?.find((o) => o.organization.id === orgId)?.organization;
      if (!org) return;

      // Sync with backend
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
             <IconLoader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold tracking-tight text-title">Setting things up...</h2>
            <p className="text-muted-foreground text-sm">
              We're preparing your workspace. This will only take a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="max-w-xl w-full space-y-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
             <span className="text-primary-foreground text-xl font-black">L</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              Welcome to Loomii
              <IconSparkles className="w-6 h-6 text-primary fill-primary/20" />
            </h1>
            <p className="text-muted-foreground text-lg">Choose where you'll be working today.</p>
          </div>
        </div>

        <Card className="border-border/40 shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-8 pt-8 px-8">
            <CardTitle className="text-2xl">Your Organizations</CardTitle>
            <CardDescription className="text-base">
              Select an existing organization or create a new one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t">
            {(userMemberships?.data || []).length === 0 ? (
              <Empty className="py-20 border-none">
                <EmptyMedia>
                  <IconBuilding className="w-16 h-16 text-muted-foreground opacity-10" />
                </EmptyMedia>
                <EmptyTitle className="text-xl">No organizations found</EmptyTitle>
                <EmptyDescription className="text-base max-w-xs mx-auto mb-8">
                  You need to be part of an organization to manage projects.
                </EmptyDescription>
              </Empty>
            ) : (
              <ItemGroup className="gap-0">
                {(userMemberships.data || []).map((membership) => (
                  <Item 
                    key={membership.organization.id} 
                    className="px-8 py-6 border-b last:border-0 rounded-none hover:bg-primary/5 transition-all group"
                  >
                    <ItemMedia variant="image" className="w-14 h-14 rounded-xl border-2 border-border/50 group-hover:border-primary/30 group-hover:scale-105 transition-all">
                       {membership.organization.imageUrl ? (
                         <img src={membership.organization.imageUrl} alt={membership.organization.name} />
                       ) : (
                         <div className="w-full h-full bg-muted flex items-center justify-center font-bold text-lg">
                           {membership.organization.name.charAt(0)}
                         </div>
                       )}
                    </ItemMedia>
                    <ItemContent className="ml-6">
                      <ItemTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {membership.organization.name}
                      </ItemTitle>
                      <ItemDescription className="text-sm">
                        {membership.role === "org:admin" ? "Administrator" : "Member"}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button onClick={() => handleSelectOrg(membership.organization.id)} size="lg" className="rounded-full shadow-lg group-hover:translate-x-1 transition-transform">
                         Enter Workspace
                         <IconArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}

            <div className="p-8 bg-muted/20 border-t flex flex-col items-center gap-6">
               <div className="flex items-center gap-4 w-full">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">or create new</span>
                  <div className="h-px bg-border flex-1" />
               </div>
               
               <CreateOrganization
                 afterCreateOrganizationUrl="/dashboard"
                 appearance={{
                   baseTheme: dark,
                   elements: {
                     rootBox: "w-full flex justify-center",
                     card: "shadow-none border-none bg-transparent p-0",
                     headerTitle: "hidden",
                     headerSubtitle: "hidden",
                     organizationCreateTrigger: "w-full py-6 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 transition-all font-bold text-lg flex gap-3 items-center justify-center",
                   }
                 }}
               />
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground opacity-50">
           Logged in as <span className="font-semibold text-foreground/70">{user?.primaryEmailAddress?.emailAddress}</span>
        </p>
      </div>
    </div>
  );
}
