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

const menuItems = [
  { title: 'Dashboard', url: '/lodge/dashboard', icon: Home },
  { title: 'Tourist Assignments', url: '/lodge/tourists', icon: Users },
  { title: 'My Trees', url: '/lodge/trees', icon: TreePine },
  { title: 'Reimbursements', url: '/lodge/reimbursements', icon: DollarSign },
  { title: 'View Performance', url: '/lodge/performance', icon: TrendingUp },
  { title: 'Notifications', url: '/lodge/notifications', icon: Bell, showBadge: true },
  { title: 'Help & Support', url: '/lodge/help', icon: HelpCircle },
];

export function LodgeSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { lodge, signOut } = useLodgeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  // Fetch unread notifications count
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
        {/* Logo Section with Collapse Button */}
        <div className={`p-4 border-b border-sidebar-border flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Expanded state: icon + text */}
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img 
                  src={ototTreeIcon} 
                  alt="OTOT" 
                  className="h-10 w-10"
                />
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
          
          {/* Collapsed state: icon with hover to show chevron */}
          {collapsed && (
            <div 
              className="relative group/logo w-full flex items-center justify-center py-2 cursor-pointer"
              onClick={toggleSidebar}
            >
              {/* Tree icon with circular background - hidden on hover */}
              <div className="h-14 w-14 rounded-full bg-sidebar-primary flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img 
                  src={ototTreeIcon} 
                  alt="OTOT" 
                  className="h-12 w-12 object-contain"
                />
              </div>
              
              {/* Grey box with chevron - shown on hover */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-sidebar-accent rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
                        {item.showBadge && unreadCount > 0 && (
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

      {/* User Profile Footer */}
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