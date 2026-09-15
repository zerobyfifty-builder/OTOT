import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

function initials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (email?.[0] || "U").toUpperCase();
}

function PortalNav({
  items,
  brand,
  tone,
}: {
  items: NavItem[];
  brand: string;
  tone: "default" | "tourist";
}) {
  const { session, signOut } = useAuth();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const tourist = tone === "tourist";

  const signOutNow = () => {
    signOut();
    navigate("/auth/login");
  };

  return (
    <Sidebar collapsible="icon" className={cn("border-r border-sidebar-border", tourist && "group/sidebar")}>
      <SidebarContent>
        <div
          className={cn(
            "flex items-center px-3 py-4",
            collapsed ? "justify-center" : tourist ? "justify-between gap-2" : "gap-2",
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <img src={ototTreeIcon} alt="" className={cn("object-contain", tourist ? "h-10 w-10" : "h-8 w-8")} />
                <div>
                  <div className={cn("font-semibold text-sidebar-foreground leading-tight", tourist ? "text-xl" : "text-sm")}>
                    OTOT
                  </div>
                  {!tourist && <div className="text-[11px] text-sidebar-foreground/60">{brand}</div>}
                </div>
              </div>
              {tourist && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {collapsed && (
            <button
              type="button"
              className={cn(
                "relative group/logo w-full flex items-center justify-center py-2",
                tourist ? "cursor-pointer" : "",
              )}
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              {tourist ? (
                <>
                  <div className="h-14 w-14 rounded-full bg-sidebar-primary flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                    <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 flex items-center justify-center bg-sidebar-accent rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                      <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
                    </div>
                  </div>
                </>
              ) : (
                <img src={ototTreeIcon} alt="OTOT" className="h-8 w-8 object-contain" />
              )}
            </button>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        onClick={() => setOpenMobile(false)}
                        className={
                          tourist
                            ? cn(
                                "glass-nav-item glass-ripple flex items-center gap-3 px-3 py-2 rounded-lg",
                                isActive
                                  ? "is-active bg-sidebar-primary text-black font-medium"
                                  : "text-white hover:bg-sidebar-accent/60",
                              )
                            : isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : ""
                        }
                      >
                        <item.icon className={cn("flex-shrink-0", tourist ? "h-5 w-5" : "h-4 w-4")} />
                        {tourist && <i aria-hidden="true" className="glass-nav-leaf" />}
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-2">
        {tourist ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-sidebar-accent transition-colors",
                  collapsed ? "justify-center" : "justify-start",
                )}
                onClick={collapsed ? toggleSidebar : undefined}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                    {initials(session?.name, session?.email)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start overflow-hidden text-left min-w-0">
                    <span className="text-sm font-medium truncate w-full text-sidebar-foreground">
                      {session?.name || "Traveler"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70 truncate w-full">{session?.email}</span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.email}</p>
              </div>
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOutNow} className="flex items-center gap-2 text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
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
                  {initials(session?.name, session?.email)}
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
              onClick={signOutNow}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </Button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({
  items,
  brand,
  children,
  mainClassName,
  tone = "default",
}: {
  items: NavItem[];
  brand: string;
  children: ReactNode;
  mainClassName?: string;
  tone?: "default" | "tourist";
}) {
  const tourist = tone === "tourist";
  return (
    <SidebarProvider>
      <div className={cn("h-svh flex w-full overflow-hidden", tourist && "tourist-glass")}>
        <PortalNav items={items} brand={brand} tone={tone} />
        <main
          className={cn(
            "flex-1 min-h-0 overflow-y-auto",
            tourist ? "tourist-glass-main" : mainClassName || "bg-background",
          )}
        >
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
