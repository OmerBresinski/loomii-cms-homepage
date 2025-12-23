import { Link, useLocation } from "@tanstack/react-router"
import { useUser, UserButton, OrganizationSwitcher } from "@clerk/clerk-react"
import { dark } from "@clerk/themes"
import { useQuery } from "@tanstack/react-query"
import { currentOrgQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { IconHome, IconFolder, IconSettings, IconChevronUp } from "@tabler/icons-react"
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
  const { user } = useUser()
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
          afterCreateOrganizationUrl="/onboarding"
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
            },
          }}
        />
      </SidebarHeader>

      <Separator className="mx-3 w-auto" />

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

      <SidebarFooter className="p-3">
        <Separator className="mb-3" />
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative group/user px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer flex items-center gap-3">
              {/* Visuals (Avatar, Name, Email) */}
              <div className="flex items-center gap-3 w-full pointer-events-none">
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border/30">
                   <UserButton
                    appearance={{
                      baseTheme: dark,
                      elements: {
                        avatarBox: "w-9 h-9 rounded-lg",
                        userButtonTrigger: "pointer-events-none"
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{user?.fullName || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <IconChevronUp className="w-4 h-4 text-muted-foreground/50" />
              </div>

              {/* The Actual Trigger (Transparent Overlay) */}
              <div className="absolute inset-0 opacity-0">
                <UserButton
                  appearance={{
                    baseTheme: dark,
                    elements: {
                      rootBox: "w-full h-full",
                      userButtonTrigger: "w-full h-full",
                      userButtonAvatarBox: "hidden"
                    }
                  }}
                />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
