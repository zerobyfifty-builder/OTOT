import React, { useEffect, useState } from 'react';
import { Home, Sprout, TreePine, DollarSign, BarChart3, Target, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  { title: 'Dashboard', url: '/stakeholder/dashboard', icon: Home },
  { title: 'Nurseries', url: '/stakeholder/nurseries', icon: Sprout },
  { title: 'Planting', url: '/stakeholder/planting', icon: TreePine },
  { title: 'Monitoring', url: '/stakeholder/monitoring', icon: BarChart3 },
  { title: 'Financial', url: '/stakeholder/financial', icon: DollarSign },
  { title: 'Outcomes', url: '/stakeholder/outcomes', icon: Target },
  { title: 'Admin', url: '/stakeholder/admin', icon: Settings },
];

interface StakeholderSidebarProps {
  organizationName?: string;
}

export function StakeholderSidebar({ organizationName }: StakeholderSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

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
                    Plantation Partner
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{organizationName || 'Stakeholder'}</p>
              <p className="text-xs text-muted-foreground">Plantation Partner</p>
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
