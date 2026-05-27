import React from 'react';
import { Home, TreePine, Trees, DollarSign, Building2, LogOut, ChevronLeft, ChevronRight, FileText, Plane } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  { title: 'Dashboard', url: '/institutional/dashboard', icon: Home },
  { title: 'Recent Trips', url: '/institutional/trips', icon: DollarSign },
  { title: 'Tree Orders', url: '/institutional/trees', icon: Trees },
  { title: 'Travel Agents', url: '/institutional/travel-agents', icon: Plane },
  { title: 'Plantation Partners', url: '/institutional/partners', icon: Building2 },
  { title: 'Disbursements', url: '/institutional/disbursements', icon: DollarSign },
  { title: 'Reports', url: '/institutional/reports', icon: FileText },
  { title: 'Available Modules', url: '/institutional/modules', icon: Home },
];

interface InstitutionalSidebarProps {
  organizationName?: string;
  organizationCategory?: string;
}

export function InstitutionalSidebar({ organizationName, organizationCategory }: InstitutionalSidebarProps) {
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
    if (!organizationName) return 'IP';
    return organizationName
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
          {/* Expanded state: icon + text */}
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img 
                  src={ototTreeIcon} 
                  alt="OTOT" 
                  className="h-10 w-10"
                />
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
          
          {/* Collapsed state: icon with hover to show chevron */}
          {collapsed && (
            <div 
              className="relative group/logo w-full flex items-center justify-center py-2 cursor-pointer"
              onClick={toggleSidebar}
            >
              <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center group-hover/logo:opacity-0 transition-opacity duration-200">
                <img 
                  src={ototTreeIcon} 
                  alt="OTOT" 
                  className="h-12 w-12 object-contain"
                />
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 flex items-center justify-center bg-gray-200 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="h-5 w-5" style={{ color: '#000000' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
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

      {/* User Profile Footer */}
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
                    {organizationName || 'Organization'}
                  </span>
                  <span className="text-xs truncate w-full" style={{ color: '#4b5563' }}>
                    {organizationCategory || 'Government Partner'}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium" style={{ color: '#000000' }}>{organizationName || 'Organization'}</p>
              <p className="text-xs truncate" style={{ color: '#6b7280' }}>{organizationCategory || 'Government Partner'}</p>
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
