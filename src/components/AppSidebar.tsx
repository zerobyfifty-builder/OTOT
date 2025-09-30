import { Home, Plane, TreePine, Calculator, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
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
import ototTreeIcon from '@/assets/otot-tree-icon.png';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'My Trips', url: '/my-trips', icon: Plane },
  { title: 'My Trees', url: '/my-trees', icon: TreePine },
  { title: 'Carbon Calculator', url: '/carbon-calculator', icon: Calculator },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user?.email) return 'User';
    return user.email.split('@')[0];
  };

  return (
    <Sidebar className={`group/sidebar ${collapsed ? 'w-20' : 'w-64'}`} collapsible="icon">
      <SidebarContent>
        {/* Logo Section with Collapse Button */}
        <div className={`p-4 border-b flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Expanded state: icon + text */}
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <img src={ototTreeIcon} alt="OTOT" className="h-10 w-10" />
                <span className="text-xl font-bold text-foreground">OTOT</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Collapsed state: icon with hover to show chevron */}
          {collapsed && (
            <div 
              className="relative group/logo cursor-pointer h-14 w-14"
              onClick={toggleSidebar}
            >
              {/* Tree icon - hidden on hover */}
              <img 
                src={ototTreeIcon} 
                alt="OTOT" 
                className="h-14 w-14 object-contain group-hover/logo:opacity-0 transition-opacity duration-200" 
              />
              
              {/* Grey box with chevron - shown on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-muted text-foreground'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
              onClick={collapsed ? toggleSidebar : undefined}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-sm font-medium truncate w-full">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
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
