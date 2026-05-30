import React from 'react';
import { Home, TreePine, Trees, DollarSign, Building2, LogOut, ChevronLeft, ChevronRight, FileText, Plane, Package, LayoutDashboard } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

// Module name → menu metadata (mirrors `modules` rows seeded for category='institutional').
const moduleMenuItems: Record<string, { title: string; url: string; icon: any; sortOrder: number }> = {
  inst_dashboard:     { title: 'Dashboard',            url: '/institutional/dashboard',     icon: Home,             sortOrder: 100 },
  inst_overview:      { title: 'Overview',             url: '/institutional/overview',      icon: LayoutDashboard,  sortOrder: 100.5 },
  inst_trips:         { title: 'Recent Trips',         url: '/institutional/trips',         icon: DollarSign,       sortOrder: 101 },
  inst_tree_orders:   { title: 'Tree Orders',          url: '/institutional/trees',         icon: Trees,            sortOrder: 102 },
  inst_travel_agents: { title: 'Travel Agents',        url: '/institutional/travel-agents', icon: Plane,            sortOrder: 103 },
  inst_partners:      { title: 'Plantation Partners',  url: '/institutional/partners',      icon: Building2,        sortOrder: 104 },
  inst_disbursements: { title: 'Disbursements',        url: '/institutional/disbursements', icon: DollarSign,       sortOrder: 105 },
  inst_reports:       { title: 'Reports',              url: '/institutional/reports',       icon: FileText,         sortOrder: 106 },
};

interface InstitutionalSidebarProps {
  organizationName?: string;
  organizationCategory?: string;
}

export function InstitutionalSidebar({ organizationName, organizationCategory }: InstitutionalSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  // Resolve org + partner sub-category for logged-in user
  const { data: orgInfo } = useQuery({
    queryKey: ['institutionalSidebarOrg', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('organization_id, organizations(name, partner_type_id)')
        .eq('user_id', user.id)
        .maybeSingle();
      return {
        organizationId: (data as any)?.organization_id || null,
        organizationName: (data as any)?.organizations?.name || null,
        partnerTypeId: (data as any)?.organizations?.partner_type_id || null,
      };
    },
    enabled: !!user?.id,
  });

  const displayName = organizationName || orgInfo?.organizationName || 'Partner';

  // Modules allocated to this partner sub-category by Super Admin
  const { data: assignedModules } = useQuery({
    queryKey: ['institutionalAssignedModules', orgInfo?.partnerTypeId],
    queryFn: async () => {
      if (!orgInfo?.partnerTypeId) return [] as string[];
      const { data, error } = await supabase
        .from('partner_type_modules')
        .select('is_active, modules(name, is_active)')
        .eq('partner_type_id', orgInfo.partnerTypeId)
        .eq('is_active', true);
      if (error) throw error;
      return (data || [])
        .map((om: any) => (om.modules?.is_active ? (om.modules?.name as string) : null))
        .filter(Boolean) as string[];
    },
    enabled: !!orgInfo?.partnerTypeId,
  });

  // Build menu dynamically from allocated modules only.
  const menuItems = React.useMemo(() => {
    const allowed = new Set(assignedModules || []);
    return Object.entries(moduleMenuItems)
      .filter(([key]) => allowed.has(key))
      .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
      .map(([, v]) => ({ title: v.title, url: v.url, icon: v.icon }));
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

  const getInitials = () => {
    if (!displayName || displayName === 'Partner') return 'IP';
    return displayName
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Sidebar 
      style={{ backgroundColor: '#f8f9fa' }}
      className={`group/sidebar border-r border-gray-300 ${collapsed ? 'w-20' : 'w-64'}`} 
      collapsible="icon"
    >
      <SidebarContent style={{ backgroundColor: '#f8f9fa' }}>
        {/* Logo Section with Collapse Button */}
        <div 
          style={{ backgroundColor: '#f8f9fa' }}
          className={`p-4 border-b border-gray-300 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img src={ototTreeIcon} alt="OTOT" className="h-10 w-10" />
                <span className="text-xl font-bold" style={{ color: '#000000' }}>OTOT</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-gray-200"
                style={{ color: '#000000' }}
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
              <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-gray-200 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5" style={{ color: '#000000' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup style={{ backgroundColor: '#f8f9fa' }}>
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
                            ? 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-primary text-primary-foreground font-medium'
                            : 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-200 font-medium'
                        }
                        style={!isActive ? { color: '#000000' } : undefined}
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

      <SidebarFooter style={{ backgroundColor: '#f8f9fa' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-200 transition-colors ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-sm font-medium truncate w-full" style={{ color: '#000000' }}>
                    {displayName}
                  </span>
                  <span className="text-xs truncate w-full" style={{ color: '#4b5563' }}>
                    {user?.email || ''}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium" style={{ color: '#000000' }}>{displayName}</p>
              <p className="text-xs truncate" style={{ color: '#6b7280' }}>{user?.email || ''}</p>
            </div>
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
