import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Building2,
  Shield,
  BarChart3,
  DollarSign,
  Trees,
  TreePine,
  Activity,
  FileText,
  Settings,
  Plug,
  ShieldAlert,
  ChevronDown,
  LogOut,
  Plane,
  Landmark,
  Map,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Users",
    icon: Users,
    items: [
      { title: "All Users", url: "/admin/users" },
      { title: "Tourists", url: "/admin/users/tourists" },
      { title: "Partners", url: "/admin/users/partners" },
      { title: "Admins", url: "/admin/users/admins" },
    ],
  },
  {
    title: "Climate Funding",
    url: "/admin/contributions",
    icon: DollarSign,
  },
  {
    title: "Tree Orders",
    url: "/admin/trees",
    icon: Trees,
  },
  {
    title: "Per-Tree Insights",
    url: "/admin/per-tree-insights",
    icon: TreePine,
  },
  {
    title: "Travel Offsets",
    url: "/admin/impact-journeys",
    icon: Plane,
  },
  {
    title: "Impact Overview",
    url: "/admin/impact-overview",
    icon: Sparkles,
  },
  {
    title: "Owners",
    url: "/admin/owners",
    icon: Landmark,
  },
  {
    title: "Partners",
    icon: Building2,
    items: [
      { title: "All Partners", url: "/admin/partners" },
      { title: "Institutional", url: "/admin/partners/institutional" },
      { title: "Business", url: "/admin/partners/business" },
      { title: "Create New Partner", url: "/admin/partners/create" },
    ],
  },
  {
    title: "Access Control",
    icon: Shield,
    items: [
      { title: "Roles & Permissions", url: "/admin/access/roles" },
      { title: "Modules", url: "/admin/access/modules" },
      { title: "Custom Access", url: "/admin/access/custom" },
    ],
  },
  {
    title: "Activity Monitor",
    url: "/admin/activity",
    icon: Activity,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit",
    icon: FileText,
  },
  {
    title: "Configuration",
    icon: Settings,
    items: [
      { title: "System Settings", url: "/admin/config/system" },
      { title: "Wallet Settings", url: "/admin/config/wallet" },
      { title: "Planting Costs", url: "/admin/config/planting-costs" },
      { title: "Contribution Tiers", url: "/admin/config/contribution-tiers" },
      { title: "Payment Settings", url: "/admin/config/payment" },
      { title: "Email Templates", url: "/admin/config/email" },
      { title: "Feature Flags", url: "/admin/config/flags" },
    ],
  },
  {
    title: "API Management",
    icon: Plug,
    items: [
      { title: "API Keys", url: "/admin/api/keys" },
      { title: "Webhooks", url: "/admin/api/webhooks" },
      { title: "Integration Logs", url: "/admin/api/logs" },
    ],
  },
  {
    title: "Security",
    url: "/admin/security",
    icon: ShieldAlert,
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarContent style={{ backgroundColor: 'hsl(220 9% 35%)' }} className="text-white">
        {/* User info header */}
        {!collapsed && (
          <div className="p-4 border-b border-admin-cream/20">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-admin-accent">
                <AvatarFallback className="bg-admin-accent text-admin-cream">
                  {user?.email ? getInitials(user.email) : 'SA'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Super Admin</p>
                <p className="text-xs text-admin-cream/70 truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-admin-cream hover:bg-admin-cream/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-admin-cream/70">God Mode</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} asChild defaultOpen={false}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="text-admin-cream hover:bg-admin-cream/10">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                          {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                className="text-admin-cream/80 hover:bg-admin-cream/10 hover:text-admin-cream"
                              >
                                <NavLink
                                  to={subItem.url}
                                  className={({ isActive }) =>
                                    isActive ? "bg-admin-cream/20 text-admin-cream font-medium" : ""
                                  }
                                >
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="text-admin-cream hover:bg-admin-cream/10"
                    >
                      <NavLink
                        to={item.url!}
                        className={({ isActive }) =>
                          isActive ? "bg-admin-cream/20 text-admin-cream font-medium" : ""
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
