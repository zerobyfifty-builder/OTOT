import React, { useEffect, useState } from 'react';
import { Home, Plane, TreePine, Calculator, Settings, LogOut, ChevronLeft, ChevronRight, Shield, Map, FileText, BarChart3 } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ototTreeIcon from '@/assets/otot-tree-icon-new.png';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'My Trips', url: '/my-trips', icon: Plane },
  { title: 'My Trees', url: '/my-trees', icon: TreePine },
  { title: 'My Impact', url: '/my-impact', icon: BarChart3 },
  { title: 'Carbon Calculator', url: '/carbon-calculator', icon: Calculator },
];

export function AppSidebar() {
  const { state, toggleSidebar, setOpen, setOpenMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  
  // Check if carbon calculator flow is active (sidebar should be frozen)
  const isFlowActive = sessionStorage.getItem('carbon_calculator_flow_active') === 'true';
  
  // Force collapse sidebar when flow is active
  React.useEffect(() => {
    if (isFlowActive && !collapsed) {
      setOpen(false);
    }
  }, [isFlowActive, collapsed, setOpen]);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name, profile_photo_url')
        .eq('user_id', user.id)
        .single();
      const fn = (data as any)?.first_name?.trim();
      const ln = (data as any)?.last_name?.trim();
      if (fn && ln) setDisplayName(`${fn} ${ln}`);
      else if (fn) setDisplayName(fn);
      if ((data as any)?.profile_photo_url) setProfilePhoto((data as any).profile_photo_url);
    };
    fetchUserProfile();
  }, [user]);

  const adminItems = [
    { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Shield },
    { title: 'Trees Management', url: '/admin/trees', icon: TreePine },
    { title: 'Lodge Management', url: '/admin/lodges', icon: Map },
    { title: 'Reimbursements', url: '/admin/reimbursements', icon: Calculator },
    { title: 'Reports', url: '/admin/reports', icon: FileText },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getUserInitials = () => {
    if (displayName) {
      const parts = displayName.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
    }
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (displayName) return displayName;
    if (!user?.email) return 'User';
    return user.email.split('@')[0];
  };

  return (
    <Sidebar 
      className={`group/sidebar ${collapsed ? 'w-20' : 'w-64'} ${isFlowActive ? 'pointer-events-none opacity-60' : ''}`} 
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
                onClick={isFlowActive ? undefined : toggleSidebar}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                disabled={isFlowActive}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Collapsed state: icon with hover to show chevron */}
          {collapsed && (
            <div 
              className={`relative group/logo w-full flex items-center justify-center py-2 ${isFlowActive ? '' : 'cursor-pointer'}`}
              onClick={isFlowActive ? undefined : toggleSidebar}
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
                        onClick={() => setOpenMobile(false)}
                        className={
                          isActive
                            ? 'glass-nav-item glass-ripple is-active flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-primary text-black font-medium'
                            : 'glass-nav-item glass-ripple flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-sidebar-accent/60'
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
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

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        onClick={() => setOpenMobile(false)}
                        className={
                          isActive
                            ? 'glass-nav-item glass-ripple is-active flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-primary text-black font-medium'
                            : 'glass-nav-item glass-ripple flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-sidebar-accent/60'
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
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
      )}
    </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter>
        <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <button
               className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-sidebar-accent transition-colors ${
                 collapsed ? 'justify-center' : 'justify-start'
               }`}
               onClick={collapsed && !isFlowActive ? toggleSidebar : undefined}
               disabled={isFlowActive}
             >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {profilePhoto && <AvatarImage src={profilePhoto} alt="Profile" />}
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
               {!collapsed && (
                 <div className="flex flex-col items-start overflow-hidden text-left">
                   <span className="text-sm font-medium truncate w-full text-sidebar-foreground">
                     {getUserDisplayName()}
                   </span>
                   <span className="text-xs text-sidebar-foreground/70 truncate w-full">
                     {user?.email}
                   </span>
                 </div>
               )}
             </button>
           </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{getUserDisplayName()}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem asChild>
              <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
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
