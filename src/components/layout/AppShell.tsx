import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/portal";
import ktbLogo from "@/assets/ktb-logo.png";
import ototTreeIcon from "@/assets/otot-tree-icon-new.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

function PortalNav({ items, brand }: { items: NavItem[]; brand: string }) {
  const { session, signOut } = useAuth();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className={`flex items-center gap-2 px-3 py-4 ${collapsed ? "justify-center" : ""}`}>
          <img src={ototTreeIcon} alt="OTOT" className="h-8 w-8 object-contain" />
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-sidebar-foreground leading-tight">OTOT</div>
              <div className="text-[11px] text-sidebar-foreground/60">{brand}</div>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={() => setOpenMobile(false)}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={toggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <div className={`flex items-center gap-2 px-1 ${collapsed ? "justify-center" : ""}`}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {(session?.name || "U")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-sidebar-foreground truncate">{session?.name}</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">
                {session ? roleLabel(session.role) : ""}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
          onClick={() => {
            signOut();
            navigate("/auth/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({
  items,
  brand,
  children,
  mainClassName,
}: {
  items: NavItem[];
  brand: string;
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <PortalNav items={items} brand={brand} />
        <main className={`flex-1 overflow-y-auto ${mainClassName || "bg-background"}`}>
          <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-3 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9" />
              <span className="text-sm font-semibold">OTOT</span>
            </div>
            <img src={ktbLogo} alt="Kenya Tourism Board" className="h-8 object-contain" />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
