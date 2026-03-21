import React, { useEffect, useState } from 'react';
import { Home, Sprout, TreePine, DollarSign, BarChart3, Target, Settings, LogOut, ChevronLeft, ChevronRight, SlidersHorizontal, Plane, Map } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
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

// Core menu items always visible
const coreMenuItems = [
  { title: 'Dashboard', url: '/stakeholder/dashboard', icon: Home },
  { title: 'Nurseries', url: '/stakeholder/nurseries', icon: Sprout },
  { title: 'Planting', url: '/stakeholder/planting', icon: TreePine },
  { title: 'Monitoring', url: '/stakeholder/monitoring', icon: BarChart3 },
  { title: 'Financial', url: '/stakeholder/financial', icon: DollarSign },
  { title: 'Community Impact', url: '/stakeholder/impact', icon: Target },
  { title: 'Outcomes', url: '/stakeholder/outcomes', icon: Target },
  { title: 'Admin', url: '/stakeholder/admin', icon: Settings },
  { title: 'Settings', url: '/stakeholder/settings', icon: SlidersHorizontal },
];

// Module-based menu items: keyed by module name from the modules table
const moduleMenuItems: Record<string, { title: string; url: string; icon: LucideIcon; insertAfter: string }> = {
  travel_agents: { title: 'Travel Agents', url: '/stakeholder/travel-agents', icon: Plane, insertAfter: 'Outcomes' },
  tree_orders: { title: 'Tree Orders', url: '/stakeholder/orders', icon: TreePine, insertAfter: 'Dashboard' },
};

interface StakeholderSidebarProps {
  organizationName?: string;
}

export function StakeholderSidebar({ organizationName: propOrgName }: StakeholderSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';
  const [orgName, setOrgName] = useState(propOrgName || '');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [partnerTypeName, setPartnerTypeName] = useState<string>('Stakeholder');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (propOrgName) { setOrgName(propOrgName); }
    if (!user) return;
    const fetchOrgInfo = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (userData) {
        const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(' ') || user.user_metadata?.full_name || '';
        setUserName(fullName);
      }
      if (userData?.organization_id) {
        setOrgId(userData.organization_id);
        const { data: org } = await supabase
          .from('organizations')
          .select('name, partner_type_id')
          .eq('id', userData.organization_id)
          .maybeSingle();
        if (org?.name && !propOrgName) setOrgName(org.name);
        if (org?.partner_type_id) {
          const { data: pt } = await supabase
            .from('partner_types')
            .select('name')
            .eq('id', org.partner_type_id)
            .maybeSingle();
          if (pt?.name) setPartnerTypeName(pt.name);
        }
      }
    };
    fetchOrgInfo();
  }, [user, propOrgName]);

  // Fetch assigned modules for this organization
  const { data: assignedModules } = useQuery({
    queryKey: ['stakeholderAssignedModules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_modules')
        .select('module_id, is_active, modules(name)')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((om: any) => om.modules?.name).filter(Boolean) as string[];
    },
    enabled: !!orgId,
  });

  // Build final menu items by inserting module-based items
  const menuItems = React.useMemo(() => {
    const items = [...coreMenuItems];
    if (assignedModules) {
      for (const moduleName of assignedModules) {
        const moduleItem = moduleMenuItems[moduleName];
        if (moduleItem) {
          const insertIndex = items.findIndex(i => i.title === moduleItem.insertAfter);
          if (insertIndex !== -1) {
            items.splice(insertIndex + 1, 0, { title: moduleItem.title, url: moduleItem.url, icon: moduleItem.icon });
          } else {
            // Insert before Settings items
            const settingsIndex = items.findIndex(i => i.title === 'Admin');
            items.splice(settingsIndex !== -1 ? settingsIndex : items.length, 0, { title: moduleItem.title, url: moduleItem.url, icon: moduleItem.icon });
          }
        }
      }
    }
    return items;
  }, [assignedModules]);

  const organizationName = orgName || undefined;

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
    if (!organizationName) return 'SH';
    return organizationName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  };

  return (
    <Sidebar
      style={{ backgroundColor: 'hsl(138 70% 22%)' }}
      className={`group/sidebar border-r border-white/10 ${collapsed ? 'w-20' : 'w-64'}`}
      collapsible="icon"
    >
      <SidebarContent style={{ backgroundColor: 'hsl(138 70% 22%)' }}>
        <div
          style={{ backgroundColor: 'hsl(138 70% 22%)' }}
          className={`p-4 border-b border-white/20 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img src={ototTreeIcon} alt="OTOT" className="h-10 w-10" />
                <span className="text-xl font-bold text-white">OTOT</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-white/10 text-white"
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
              <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img src={ototTreeIcon} alt="OTOT" className="h-12 w-12 object-contain" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-white/20 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup style={{ backgroundColor: 'hsl(138 70% 22%)' }}>
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
                            ? 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-white/20 text-white font-medium'
                            : 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10 text-white/80 font-medium'
                        }
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

      <SidebarFooter style={{ backgroundColor: 'hsl(138 70% 22%)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors ${
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
                  <span className="text-sm font-medium truncate w-full text-white">
                    {organizationName || 'Stakeholder'}
                  </span>
                  <span className="text-xs truncate w-full text-white/60">
                    {partnerTypeName}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{organizationName || 'Stakeholder'}</p>
              <p className="text-xs text-muted-foreground">{partnerTypeName}</p>
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
