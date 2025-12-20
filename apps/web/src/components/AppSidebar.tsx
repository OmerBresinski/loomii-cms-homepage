import { Link, useLocation } from "@tanstack/react-router"
import { useUser, UserButton, OrganizationSwitcher } from "@clerk/clerk-react"
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
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

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
      <SidebarHeader className="h-16 flex justify-center px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">L</span>
          </div>
          <span>Loomii</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 py-4">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/onboarding"
              afterSelectOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/onboarding"
              hidePersonal
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger: cn(
                    "w-full px-3 py-2 rounded-md",
                    "bg-secondary border border-border",
                    "hover:bg-accent",
                    "transition-all text-sm"
                  ),
                },
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to)

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton render={<Link to={item.to} />} isActive={isActive} >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.label === "Settings" && !hasGitHub && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="px-2">
              <div className="flex items-center gap-3 w-full">
                <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <IconChevronUp className="w-4 h-4 ml-auto text-muted-foreground" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
