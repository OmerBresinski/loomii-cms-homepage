import { useNavigate, useSearch } from "@tanstack/react-router";
import { useOrganization } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { currentOrgQuery } from "@/lib/queries";
import { IconBrandGithub, IconSettings, IconShield, IconCheck, IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions } from "@/components/ui/item";
import { toast } from "sonner";
import { useEffect } from "react";

export function SettingsPage() {
  const { organization } = useOrganization();
  const { data: orgData, isLoading } = useQuery(currentOrgQuery());
  const search = useSearch({ from: "/dashboard/settings" });
  const navigate = useNavigate();

  const hasGitHub = orgData?.organization?.hasGitHubConnected;

  useEffect(() => {
    if (search.github === "success") {
      toast.success("GitHub account connected successfully!");
      // Clear the search params
      navigate({ from: "/dashboard/settings", search: (prev: any) => ({ ...prev, github: undefined, error: undefined }) as any });
    } else if (search.error) {
      toast.error(`Connection failed: ${search.error}`);
      navigate({ from: "/dashboard/settings", search: (prev: any) => ({ ...prev, github: undefined, error: undefined }) as any });
    }
  }, [search.github, search.error, navigate]);

  const handleConnectGitHub = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    window.location.href = `${apiUrl}/auth/github?clerkOrgId=${organization?.id}`;
  };

  if (!organization) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your organization and integrations.</p>
      </div>

      <div className="grid gap-10">
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <IconShield className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Organization</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>General information about your team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Field orientation="horizontal">
                <FieldLabel className="text-sm font-medium">Name</FieldLabel>
                <FieldContent>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {organization.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-lg">{organization.name}</span>
                   </div>
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel className="text-sm font-medium">Identifier</FieldLabel>
                <FieldContent>
                  <code className="px-2 py-1 bg-muted rounded text-xs font-mono">{organization.id}</code>
                </FieldContent>
              </Field>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <IconSettings className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Integrations</h2>
          </div>
          <Card>
             <CardHeader className="pb-4">
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your connections to external services.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               <ItemGroup className="gap-0 border-t">
                  <Item className="px-6 py-8 rounded-none bg-transparent">
                    <ItemMedia variant="icon" className="w-12 h-12 rounded-xl bg-[#24292f]/5 dark:bg-white/5 border shrink-0">
                      <IconBrandGithub className="w-6 h-6" />
                    </ItemMedia>
                    <ItemContent className="ml-6">
                      <ItemTitle className="text-lg">GitHub</ItemTitle>
                      <ItemDescription className="text-sm mt-1">
                        Connect your GitHub account to sync repositories and deploy content changes.
                      </ItemDescription>
                      <div className="flex items-center gap-2 mt-3">
                        {isLoading ? (
                          <Badge variant="secondary" className="gap-1.5">
                            <IconRefresh className="w-3 h-3 animate-spin" />
                            Checking status...
                          </Badge>
                        ) : hasGitHub ? (
                          <Badge variant="success" className="gap-1.5 px-3">
                            <IconCheck className="w-3 h-3" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1.5 px-3">
                            <IconAlertCircle className="w-3 h-3" />
                            Not connected
                          </Badge>
                        )}
                      </div>
                    </ItemContent>
                    <ItemActions>
                       {hasGitHub ? (
                         <Button variant="outline" size="sm" className="opacity-50" disabled>
                           Disconnect
                         </Button>
                       ) : (
                         <Button onClick={handleConnectGitHub} className="bg-[#24292f] hover:bg-[#24292f]/90 text-white">
                           <IconBrandGithub className="w-4 h-4 mr-2" />
                           Connect GitHub
                         </Button>
                       )}
                    </ItemActions>
                  </Item>
               </ItemGroup>
             </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
