import React from 'react';
import { Home, Users, TreePine, DollarSign, TrendingUp, HelpCircle, ChevronLeft, ChevronRight, Settings, LogOut, Bell } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLodgeAuth } from '@/contexts/LodgeAuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ototTreeIcon from '@/assets/otot-tree-icon-new.png';

// Module name → menu metadata; mirrors `modules` rows seeded for category='lodge'.
const moduleMenuItems: Record<string, { title: string; url: string; icon: any; sortOrder: number; showBadge?: boolean }> = {
  lodge_dashboard:      { title: 'Dashboard',           url: '/lodge/dashboard',       icon: Home,        sortOrder: 200 },
  lodge_tourists:       { title: 'Tourist Assignments', url: '/lodge/tourists',        icon: Users,       sortOrder: 201 },
  lodge_trees:          { title: 'My Trees',            url: '/lodge/trees',           icon: TreePine,    sortOrder: 202 },
  lodge_reimbursements: { title: 'Reimbursements',      url: '/lodge/reimbursements',  icon: DollarSign,  sortOrder: 203 },
  lodge_performance:    { title: 'View Performance',    url: '/lodge/performance',     icon: TrendingUp,  sortOrder: 204 },
  lodge_notifications:  { title: 'Notifications',       url: '/lodge/notifications',   icon: Bell,        sortOrder: 205, showBadge: true },
};

const helpItem = { title: 'Help & Support', url: '/lodge/help', icon: HelpCircle };

export function LodgeSidebar() {
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const { lodge, signOut } = useLodgeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  // Unread notifications
  const { data: unreadCount } = useQuery({
    queryKey: ['lodge-unread-notifications', lodge?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', lodge?.id)
        .eq('recipient_type', 'lodge')
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!lodge,
  });

  // Allocated modules for the Lodge partner sub-category (Business → Lodge)
  const { data: assignedModules } = useQuery({
    queryKey: ['lodgeAssignedModules'],
    queryFn: async () => {
      const { data: types } = await supabase
        .from('partner_types')
        .select('id, name, category')
        .eq('category', 'business');
      const lodgeTypeIds = (types || [])
        .filter((t: any) => (t.name || '').toLowerCase() === 'lodge')
        .map((t: any) => t.id);
      if (!lodgeTypeIds.length) return null;
      const { data, error } = await supabase
        .from('partner_type_modules')
        .select('is_active, modules(name, is_active)')
        .in('partner_type_id', lodgeTypeIds)
        .eq('is_active', true);
      if (error) throw error;
      return (data || [])
        .map((om: any) => (om.modules?.is_active ? (om.modules?.name as string) : null))
        .filter(Boolean) as string[];
    },
  });

  // Build menu: if no allocation rows exist for this lodge, fall back to ALL items (safe default
  // for lodges not yet present in the organizations registry).
  const menuItems = React.useMemo(() => {
    const allKnown = Object.values(moduleMenuItems).sort((a, b) => a.sortOrder - b.sortOrder);
    const items =
      assignedModules && assignedModules.length > 0
        ? Object.entries(moduleMenuItems)
            .filter(([key]) => assignedModules.includes(key))
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([, v]) => v)
        : allKnown;
    return [...items, helpItem];
  }, [assignedModules]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/auth/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getLodgeInitials = () => {
    if (!lodge?.name) return 'L';
    return lodge.name.charAt(0).toUpperCase();
  };

  return (
    <Sidebar 
      className={`group/sidebar ${collapsed ? 'w-20' : 'w-64'}`} 
      collapsible="icon"
    >
      <SidebarContent>
        <div className={`p-4 border-b border-sidebar-border flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img src={ototTreeIcon} alt="OTOT" className="h-10 w-10" />
                <span className="text-xl font-bold text-sidebar-foreground">OTOT</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {collapsed && (
            <div 
              className="relative group/logo w-full flex items-center justify-center py-2 cursor-pointer"
              onClick={toggleSidebar}
            >
              <div className="h-14 w-14 rounded-full bg-sidebar-primary flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-sidebar-accent rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item: any) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={
                          isActive
                            ? 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-sidebar-primary text-black font-medium relative'
                            : 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-white hover:text-sidebar-primary hover:bg-sidebar-accent relative'
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                        {item.showBadge && (unreadCount || 0) > 0 && (
                          <span className="absolute top-1 left-7 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-sidebar-accent transition-colors ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {getLodgeInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-sm font-medium truncate w-full text-sidebar-foreground">
                    {lodge?.name}
                  </span>
                  <span className="text-xs text-sidebar-foreground/70 truncate w-full">
                    {lodge?.username}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{lodge?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{lodge?.username}</p>
            </div>
            <DropdownMenuItem asChild>
              <NavLink to="/lodge/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
