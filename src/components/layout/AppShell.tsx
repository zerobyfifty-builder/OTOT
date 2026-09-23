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
  SidebarGroupLabel,
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
import type { CSSProperties, ReactNode } from "react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export type ShellTone = "tourist" | "ministry" | "partner" | "admin";

type PanelTheme = {
  vars: CSSProperties;
  sidebar: string;
  headerBorder: string;
  brand: string;
  toggle: string;
  collapsedLogo: string;
  collapsedHover: string;
  active: string;
  idle: string;
  footerButton: string;
  name: string;
  meta: string;
};

function sidebarVars(background: string, foreground: string, accent: string, border: string): CSSProperties {
  return {
    backgroundColor: `hsl(${background})`,
    "--sidebar-background": background,
    "--sidebar-foreground": foreground,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
  } as CSSProperties;
}

const PANEL_THEMES: Record<"ministry" | "partner", PanelTheme> = {
  ministry: {
    vars: sidebarVars("210 17% 98%", "0 0% 0%", "220 13% 91%", "216 12% 84%"),
    sidebar: "border-r border-gray-300",
    headerBorder: "border-gray-300",
    brand: "text-black",
    toggle: "text-black hover:bg-gray-200",
    collapsedLogo: "bg-white",
    collapsedHover: "bg-gray-200",
    active: "bg-primary text-primary-foreground font-medium",
    idle: "text-black hover:bg-gray-200 font-medium",
    footerButton: "hover:bg-gray-200",
    name: "text-black",
    meta: "text-gray-600",
  },
  partner: {
    vars: sidebarVars("138 70% 22%", "0 0% 100%", "0 0% 100% / 0.1", "0 0% 100% / 0.2"),
    sidebar: "border-r border-white/10",
    headerBorder: "border-white/20",
    brand: "text-white",
    toggle: "text-white hover:bg-white/10",
    collapsedLogo: "bg-white/10",
    collapsedHover: "bg-white/20",
    active: "bg-white/20 text-white font-medium",
    idle: "text-white/80 hover:bg-white/10 font-medium",
    footerButton: "hover:bg-white/10",
    name: "text-white",
    meta: "text-white/60",
  },
};

const ADMIN_VARS = sidebarVars("220 9% 35%", "40 40% 98%", "40 40% 98% / 0.1", "40 40% 98% / 0.2");

function initials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (email?.[0] || "U").toUpperCase();
}

function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return () => {
    signOut();
    navigate("/auth/login");
  };
}

function TouristNav({ items }: { items: NavItem[] }) {
  const { session } = useAuth();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const signOutNow = useSignOut();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border group/sidebar">
      <SidebarContent>
        <div
          className={cn(
            "flex items-center p-4 border-b border-sidebar-border",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <img src={ototTreeIcon} alt="" className="object-contain h-10 w-10" />
                <div>
                  <div className="text-sidebar-foreground leading-tight text-xl font-bold">OTOT</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          {collapsed && (
            <button
              type="button"
              className="relative group/logo w-full flex items-center justify-center py-2 cursor-pointer"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <div className="h-14 w-14 rounded-full bg-sidebar-primary flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-sidebar-accent rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
                </div>
              </div>
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
                        className={cn(
                          "glass-nav-item glass-ripple flex items-center gap-3 px-3 py-2 rounded-lg",
                          isActive
                            ? "is-active bg-sidebar-primary text-black font-medium"
                            : "text-white hover:bg-sidebar-accent/60",
                        )}
                      >
                        <item.icon className="flex-shrink-0 h-5 w-5" />
                        <i aria-hidden="true" className="glass-nav-leaf" />
                        {!collapsed && <span>{item.title}</span>}
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
      </SidebarFooter>
    </Sidebar>
  );
}

function PanelNav({ items, brand, theme }: { items: NavItem[]; brand: string; theme: PanelTheme }) {
  const { session } = useAuth();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const signOutNow = useSignOut();
  const roleText = session ? roleLabel(session.role) : brand;

  return (
    <Sidebar collapsible="icon" className={cn("group/sidebar", theme.sidebar)}>
      <SidebarContent style={theme.vars}>
        <div
          className={cn(
            "p-4 border-b flex items-center",
            theme.headerBorder,
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img src={ototTreeIcon} alt="OTOT" className="h-10 w-10" />
                <span className={cn("text-xl font-bold", theme.brand)}>OTOT</span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn("hidden md:flex h-8 w-8", theme.toggle)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          {collapsed && (
            <button
              type="button"
              className="relative group/logo w-full flex items-center justify-center py-2 cursor-pointer"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200",
                  theme.collapsedLogo,
                )}
              >
                <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "h-14 w-14 flex items-center justify-center rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200",
                    theme.collapsedHover,
                  )}
                >
                  <ChevronRight className={cn("h-5 w-5", theme.brand)} />
                </div>
              </div>
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
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive ? theme.active : theme.idle,
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter style={theme.vars}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                theme.footerButton,
                collapsed ? "justify-center" : "justify-start",
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials(session?.name, session?.email)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className={cn("text-sm font-medium truncate w-full", theme.name)}>{session?.name || brand}</span>
                  <span className={cn("text-xs truncate w-full", theme.meta)}>{roleText}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session?.name || brand}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.email}</p>
              <p className="text-[11px] text-muted-foreground/80 truncate">{roleText}</p>
            </div>
            <DropdownMenuItem onClick={signOutNow} className="flex items-center gap-2 text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminNav({ items }: { items: NavItem[] }) {
  const { session } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const signOutNow = useSignOut();

  return (
    <Sidebar>
      <SidebarContent style={ADMIN_VARS} className="text-white">
        {!collapsed && (
          <div className="p-4 border-b border-admin-cream/20">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-admin-accent">
                <AvatarFallback className="bg-admin-accent text-admin-cream">
                  {session?.email ? session.email.substring(0, 2).toUpperCase() : "SA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session ? roleLabel(session.role) : "Super Admin"}</p>
                <p className="text-xs text-admin-cream/70 truncate">{session?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOutNow}
                className="h-8 w-8 text-admin-cream hover:bg-admin-cream/10"
                aria-label="Sign out"
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
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className="text-admin-cream hover:bg-admin-cream/10">
                    <NavLink
                      to={item.url}
                      end
                      onClick={() => setOpenMobile(false)}
                      className={({ isActive }) => (isActive ? "bg-admin-cream/20 text-admin-cream font-medium" : "")}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const MAIN_CLASS: Record<ShellTone, string> = {
  tourist: "overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] tourist-glass-main",
  ministry: "bg-background relative",
  partner: "bg-background",
  admin: "bg-admin-cream",
};

export function AppShell({
  items,
  brand,
  children,
  tone,
}: {
  items: NavItem[];
  brand: string;
  children: ReactNode;
  tone: ShellTone;
}) {
  const tourist = tone === "tourist";
  return (
    <SidebarProvider>
      <div className={cn("h-svh flex w-full overflow-hidden", tourist && "tourist-glass")}>
        {tourist ? (
          <TouristNav items={items} />
        ) : tone === "admin" ? (
          <AdminNav items={items} />
        ) : (
          <PanelNav items={items} brand={brand} theme={PANEL_THEMES[tone]} />
        )}
        <main className={cn("flex-1 min-h-0 overflow-y-auto", MAIN_CLASS[tone])}>
          <div className="md:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9" />
              <span className="text-sm font-semibold text-foreground">OTOT</span>
            </div>
            <img src={ktbLogo} alt="Kenya Tourism Board" className="h-8 object-contain" />
          </div>
          {tone === "ministry" && (
            <div className="sticky top-0 right-0 z-10 hidden md:flex justify-end p-4 pointer-events-none">
              <img src={ktbLogo} alt="KTB" className="h-14 object-contain pointer-events-auto" />
            </div>
          )}
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
