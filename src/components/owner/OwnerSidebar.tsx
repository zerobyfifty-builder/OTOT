import React, { useEffect, useState } from 'react';
import { Home, Sprout, TreePine, Trees, DollarSign, BarChart3, Target, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, Plane, CreditCard, MapPin, Leaf, Users, Pickaxe, Map, Sparkles, Wallet, Coins, Layers } from 'lucide-react';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ototTreeIcon from '@/assets/otot-tree-icon-new.png';

// Core menu items (gated by module permissions: dashboard, financial_management)
const coreMenuItems: { title: string; url: string; icon: LucideIcon; moduleKey: string }[] = [
  { title: 'Dashboard', url: '/owner/dashboard', icon: Home, moduleKey: 'dashboard' },
  { title: 'Climate Funding', url: '/owner/financial', icon: DollarSign, moduleKey: 'financial_management' },
];

// Module-based menu items that appear as flat items after core + collapsible groups
// sortOrder determines the display order among flat module items
const moduleMenuItems: Record<string, { title: string; url: string; icon: LucideIcon; sortOrder: number }> = {
  trip_management: { title: 'Travel Offsets', url: '/owner/trip-management', icon: Plane, sortOrder: 0 },
  tree_orders: { title: 'Tree Orders', url: '/owner/orders', icon: Trees, sortOrder: 1 },
  // Tree Operations and Forest Registry are collapsible groups inserted at sortOrder 2 and 3
  outcomes: { title: 'Environmental Impact', url: '/owner/outcomes', icon: Target, sortOrder: 4 },
  impact_insights: { title: 'Impact Overview', url: '/owner/impact-insights', icon: Sparkles, sortOrder: 5 },
  analytics: { title: 'Analytics', url: '/owner/analytics', icon: BarChart3, sortOrder: 99 },
  
  travel_agents: { title: 'Travel Agents', url: '/owner/travel-agents', icon: Plane, sortOrder: 9 },
};

// Tree Operations modules that appear under collapsible group
const treeOpsModuleItems: Record<string, { title: string; url: string; icon: LucideIcon; sortOrder: number }> = {
  tree_management: { title: 'Per-Tree Insights', url: '/owner/per-tree-insights', icon: TreePine, sortOrder: 3 },
  community_impact: { title: 'Community Impact', url: '/owner/impact', icon: Target, sortOrder: 4 },
};

// MDM modules that appear under "Forest Registry" collapsible
const mdmModuleItems: Record<string, { title: string; url: string; icon: LucideIcon }> = {
  mdm_locations: { title: 'Forest Locations', url: '/owner/locations', icon: MapPin },
  mdm_nurseries: { title: 'Nurseries & CBOs', url: '/owner/mdm-nurseries', icon: Sprout },
  mdm_species: { title: 'Species & Seedlings', url: '/owner/mdm-species', icon: Leaf },
  mdm_planters: { title: 'Planters Registry', url: '/owner/mdm-planters', icon: Users },
  mdm_sequestration: { title: 'Sequestration Rates', url: '/owner/mdm-sequestration', icon: BarChart3 },
};

// Configuration modules that appear under "Configuration" collapsible
const configModuleItems: Record<string, { title: string; url: string; icon: LucideIcon }> = {
  wallet_settings: { title: 'Wallet Settings', url: '/owner/config/wallet', icon: Wallet },
  planting_costs: { title: 'Planting Costs', url: '/owner/config/planting-costs', icon: Coins },
  contribution_tiers: { title: 'Contribution Tiers', url: '/owner/config/contribution-tiers', icon: Layers },
};

interface OwnerSidebarProps {
  organizationName?: string;
}

export function OwnerSidebar({ organizationName: propOrgName }: OwnerSidebarProps) {
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';
  const cacheKey = user ? `ownerSidebarPartnerType:${user.id}` : '';
  const cachedPartnerType = (typeof window !== 'undefined' && cacheKey) ? localStorage.getItem(cacheKey) || '' : '';
  const [orgName, setOrgName] = useState(propOrgName || '');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [partnerTypeName, setPartnerTypeName] = useState<string>(cachedPartnerType);
  const [partnerCategory, setPartnerCategory] = useState<string>('plantation');
  const [userName, setUserName] = useState<string>('');
  const [userJobRole, setUserJobRole] = useState<string>('');
  const [isOrgAdmin, setIsOrgAdmin] = useState<boolean>(false);
  const [orgUserId, setOrgUserId] = useState<string | null>(null);

  useEffect(() => {
    if (propOrgName) { setOrgName(propOrgName); }
    if (!user) return;
    const fetchOrgInfo = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      let resolvedName = [userData?.first_name, userData?.last_name].filter(Boolean).join(' ');
      if (userData?.organization_id) {
        setOrgId(userData.organization_id);
        const { data: ou } = await supabase
          .from('org_users')
          .select('id, job_role, status, first_name, last_name')
          .eq('organization_id', userData.organization_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (ou) {
          setOrgUserId(ou.id);
          setIsOrgAdmin(ou.job_role === 'org_admin' && ou.status === 'active');
          setUserJobRole(ou.job_role || '');
          const ouName = [ou.first_name, ou.last_name].filter(Boolean).join(' ');
          if (ouName) resolvedName = ouName;
        } else {
          setIsOrgAdmin(true);
        }
        const { data: org } = await supabase
          .from('organizations')
          .select('name, partner_type_id')
          .eq('id', userData.organization_id)
          .maybeSingle();
        if (org?.name && !propOrgName) setOrgName(org.name);
        if (org?.partner_type_id) {
          const { data: pt } = await supabase
            .from('partner_types')
            .select('name, category')
            .eq('id', org.partner_type_id)
            .maybeSingle();
          if (pt?.name) {
            setPartnerTypeName(pt.name);
            if (cacheKey) {
              try { localStorage.setItem(cacheKey, pt.name); } catch {}
            }
          }
          if (pt?.category) setPartnerCategory(pt.category.toLowerCase());
        }
      }
      if (!resolvedName) resolvedName = user.user_metadata?.full_name || '';
      setUserName(resolvedName);
    };
    fetchOrgInfo();
  }, [user, propOrgName]);

  // Fetch org-assigned modules
  const { data: orgModules } = useQuery({
    queryKey: ['ownerAssignedModules', orgId],
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

  // Fetch this user's per-module permissions (only when not org admin)
  const { data: userModulePerms } = useQuery({
    queryKey: ['ownerUserModulePerms', orgUserId],
    queryFn: async () => {
      if (!orgUserId) return [] as string[];
      const { data, error } = await supabase
        .from('org_user_permissions')
        .select('module_name, enabled, permissions')
        .eq('org_user_id', orgUserId)
        .eq('enabled', true);
      if (error) throw error;
      return (data || [])
        .filter((p: any) => (p.permissions as any)?.read)
        .map((p: any) => p.module_name as string);
    },
    enabled: !!orgUserId,
  });

  // Effective module list: org admins see all org modules; members see intersection with their permissions
  const assignedModules = React.useMemo(() => {
    if (!orgModules) return [];
    if (isOrgAdmin) return orgModules;
    if (!userModulePerms) return [];
    const allowed = new Set(userModulePerms);
    return orgModules.filter((m) => allowed.has(m));
  }, [orgModules, userModulePerms, isOrgAdmin]);

  // Build flat menu items: core items + assigned module items sorted by sortOrder
  const flatModuleItems = React.useMemo(() => {
    if (!assignedModules) return [];
    return Object.entries(moduleMenuItems)
      .filter(([key]) => assignedModules.includes(key))
      .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
      .map(([, val]) => ({ title: val.title, url: val.url, icon: val.icon }));
  }, [assignedModules]);

  // Build Tree Operations sub-items from assigned modules
  const treeOpsItems = React.useMemo(() => {
    if (!assignedModules) return [];
    return Object.entries(treeOpsModuleItems)
      .filter(([key]) => assignedModules.includes(key))
      .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
      .map(([, val]) => val);
  }, [assignedModules]);

  // Build Forest Registry sub-items from assigned MDM modules
  const forestRegistryItems = React.useMemo(() => {
    if (!assignedModules) return [];
    return Object.entries(mdmModuleItems)
      .filter(([key]) => assignedModules.includes(key))
      .map(([, val]) => val);
  }, [assignedModules]);

  // Build Configuration sub-items from assigned modules
  const configurationItems = React.useMemo(() => {
    if (!assignedModules) return [];
    return Object.entries(configModuleItems)
      .filter(([key]) => assignedModules.includes(key))
      .map(([, val]) => val);
  }, [assignedModules]);

  const organizationName = orgName || undefined;

  // Dynamic sidebar color based on owner type name
  // Dynamic sidebar color based on owner type name.
  // While partner type is loading (empty), use a neutral dark color so we don't
  // flash the plantation green before switching to the real theme.
  const sidebarColor = (() => {
    const name = partnerTypeName.toLowerCase();
    if (!name) return 'hsl(220 15% 20%)'; // neutral while loading
    if (name.includes('government') || name.includes('ktb')) return 'hsl(348 70% 30%)';
    if (name.includes('technology') || name.includes('tech')) return 'hsl(212 100% 50%)';
    return 'hsl(138 70% 22%)'; // Plantation / default
  })();

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
      style={{ backgroundColor: sidebarColor }}
      className={`group/sidebar border-r border-white/10 ${collapsed ? 'w-20' : 'w-64'}`}
      collapsible="icon"
    >
      <SidebarContent style={{ backgroundColor: sidebarColor }}>
        <div
          style={{ backgroundColor: sidebarColor }}
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

        <SidebarGroup style={{ backgroundColor: sidebarColor }}>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 1. Core items: Dashboard, Financial — gated by permissions (admins see all) */}
              {coreMenuItems.filter(item => isOrgAdmin || assignedModules.includes(item.moduleKey)).map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        onClick={() => setOpenMobile(false)}
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

              {/* 2. Tree Orders (flat, if assigned) */}
              {flatModuleItems.filter(i => i.title === 'Tree Orders').map((item) => {
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

              {/* 3. Tree Operations items (flat) */}
              {treeOpsItems.map((item) => {
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

              {/* 4. Remaining flat module items: Analytics, Outcomes, etc. */}
              {flatModuleItems.filter(i => i.title !== 'Tree Orders').map((item) => {
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

              {/* 5. Forest Registry (collapsible) — always last */}
              {forestRegistryItems.length > 0 && (
                <Collapsible asChild defaultOpen={forestRegistryItems.some(i => location.pathname === i.url)}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10 text-white/80 font-medium w-full">
                        <Trees className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>Forest Registry</span>}
                        {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {forestRegistryItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild className="text-white/70 hover:bg-white/10 hover:text-white">
                              <NavLink
                                to={subItem.url}
                                className={({ isActive }) =>
                                  isActive ? 'bg-white/20 text-white font-medium' : ''
                                }
                              >
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* 6. Configuration (collapsible) */}
              {configurationItems.length > 0 && (
                <Collapsible asChild defaultOpen={configurationItems.some(i => location.pathname === i.url)}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10 text-white/80 font-medium w-full">
                        <Settings className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>Configuration</span>}
                        {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {configurationItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild className="text-white/70 hover:bg-white/10 hover:text-white">
                              <NavLink
                                to={subItem.url}
                                className={({ isActive }) =>
                                  isActive ? 'bg-white/20 text-white font-medium' : ''
                                }
                              >
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter style={{ backgroundColor: sidebarColor }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {(userName || organizationName || 'U').split(' ').map(w => w.charAt(0)).slice(0,2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-sm font-medium truncate w-full text-white">
                    {userName || organizationName || 'Owner'}
                  </span>
                  <span className="text-xs truncate w-full text-white/60 capitalize">
                    {(userJobRole || (isOrgAdmin ? 'Org Admin' : partnerTypeName)).replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName || organizationName || 'Owner'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {(userJobRole || (isOrgAdmin ? 'Org Admin' : partnerTypeName)).replace(/_/g, ' ')}
              </p>
              {userName && organizationName && (
                <p className="text-[11px] text-muted-foreground/80 truncate">{organizationName}</p>
              )}
            </div>
            {isOrgAdmin && (
              <DropdownMenuItem onClick={() => navigate('/owner/settings')} className="flex items-center gap-2 cursor-pointer">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Organization Settings</span>
              </DropdownMenuItem>
            )}
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
