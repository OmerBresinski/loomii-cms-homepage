import { Link, useLocation } from "@tanstack/react-router"
import { UserButton, OrganizationSwitcher } from "@clerk/clerk-react"
import { dark } from "@clerk/themes"
import { useQuery } from "@tanstack/react-query"
import { currentOrgQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { IconHome, IconFolder, IconSettings } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/ui/sidebar"
import { Separator } from "@/ui/separator"

export function AppSidebar() {
  const { data: orgData } = useQuery(currentOrgQuery())
  const location = useLocation()
  const hasGitHub = orgData?.organization?.hasGitHubConnected

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: IconHome, exact: true },
    { to: "/dashboard/projects", label: "Projects", icon: IconFolder },
    { to: "/dashboard/settings", label: "Settings", icon: IconSettings },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/dashboard"
          afterLeaveOrganizationUrl="/onboarding"
          hidePersonal
          appearance={{
            baseTheme: dark,
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger: cn(
                "w-full px-3 py-2.5 rounded-lg",
                "bg-transparent border-0",
                "hover:bg-sidebar-accent",
                "transition-all text-sm"
              ),
              organizationSwitcherTriggerIcon: "text-muted-foreground",
              organizationPreviewAvatarBox: "w-8 h-8 rounded-lg",
              organizationPreviewMainIdentifier: "text-foreground font-semibold text-sm",
              organizationPreviewTextContainer: "gap-0",
              organizationSwitcherPopoverActionButton__createOrganization: "!hidden",
            },
          }}
        />
      </SidebarHeader>

      <div className="px-3">
        <Separator />
      </div>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to)

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      isActive={isActive}
                      className={cn(
                        "h-10 px-3 rounded-lg transition-all",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                      <span>{item.label}</span>
                      {item.label === "Settings" && !hasGitHub && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-0">
        <div className="px-0">
          <Separator className="mb-3" />
        </div>
        <UserButton
          appearance={{
            baseTheme: dark,
            elements: {
              rootBox: "w-full",
              userButtonTrigger: cn(
                "w-full px-3 py-2.5 rounded-lg",
                "hover:bg-sidebar-accent transition-colors",
                "flex items-center gap-3"
              ),
              userButtonAvatarBox: "w-8 h-8 rounded-lg shrink-0 order-first",
              userButtonOuterIdentifier: "text-sm font-medium text-foreground truncate order-last flex-1 text-left",
              userButtonBox: "flex-row items-center gap-3 w-full",
            }
          }}
          showName
        />
      </SidebarFooter>
    </Sidebar>
  )
}
