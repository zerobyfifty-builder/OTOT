import { useNavigate } from "react-router-dom";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Camera, TreePine, DollarSign, Star, TrendingUp, AlertCircle, CheckCircle, Clock, Users, LogOut, Menu, Camera as CameraIcon, Upload, User, HelpCircle } from "lucide-react";
import { TouristNotifications } from "@/components/lodge/TouristNotifications";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const LodgeDashboard = () => {
  const navigate = useNavigate();
  const { lodge } = useLodgeAuth();
  const { user } = useAuth();

  // Get organization_id from authenticated user
  const { data: userOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();
      return data?.organization_id;
    },
    enabled: !!user,
  });

  // Fetch stats using organization_id
  const { data: stats, isLoading } = useQuery({
    queryKey: ['lodge-stats', userOrg],
    queryFn: async () => {
      const { data: trees } = await supabase
        .from('trees')
        .select('*')
        .eq('lodge_id', userOrg);

      const { data: reimbursements } = await supabase
        .from('reimbursements')
        .select('*')
        .eq('lodge_id', userOrg);

      const thisMonth = new Date();
      thisMonth.setDate(1);

      const treesThisMonth = trees?.filter(t => new Date(t.created_at) >= thisMonth).length || 0;
      const pendingTrees = trees?.filter(t => t.status === 'Waiting to be Assigned').length || 0;
      const plantedTrees = trees?.filter(t => t.status === 'Planted').length || 0;
      const pendingReimbursements = reimbursements?.filter(r => r.status === 'pending').length || 0;

      return {
        treesThisMonth,
        pendingTrees,
        plantedTrees,
        pendingReimbursements,
        totalTrees: trees?.length || 0,
        totalEarnings: reimbursements?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        pendingEarnings: reimbursements?.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        paidEarnings: reimbursements?.filter(r => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      };
    },
    enabled: !!userOrg,
  });

  // Fetch notifications for the lodge using organization_id
  const { data: notifications } = useQuery({
    queryKey: ['lodge-notifications', userOrg],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userOrg)
        .eq('recipient_type', 'lodge')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userOrg,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {lodge?.name}! 🌳</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your trees today</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trees This Month */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Trees This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-600">{stats?.treesThisMonth || 0}</span>
                <span className="text-gray-400">/50</span>
              </div>
              <Progress value={((stats?.treesThisMonth || 0) / 50) * 100} className="h-2" />
              <p className="text-sm text-green-600 font-medium">+23% vs last month</p>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Trees to assign:</span>
                  <span className="font-semibold">{stats?.pendingTrees || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Trees planted:</span>
                  <span className="font-semibold">{stats?.plantedTrees || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reimbursements:</span>
                  <span className="font-semibold text-orange-600">{stats?.pendingReimbursements || 0}</span>
                </div>
              </div>
              {(stats?.pendingTrees || 0) > 0 && (
                <Badge variant="destructive" className="w-full justify-center">Action Required</Badge>
              )}
            </CardContent>
          </Card>

          {/* Earnings This Month */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Earnings This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">${stats?.totalEarnings || 0}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold">${stats?.pendingEarnings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold text-green-600">${stats?.paidEarnings || 0}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Next payment: Oct 25</p>
            </CardContent>
          </Card>

          {/* Performance Score */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Performance Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-purple-600">4.8</span>
                <span className="text-gray-400">/5</span>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Response time:</span>
                  <span className="text-green-600 font-medium">Excellent</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Survival rate:</span>
                  <span className="text-green-600 font-medium">92%</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Trending up</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications ({notifications?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!notifications || notifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No new notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 rounded-lg border ${
                      notification.priority === 'high' || notification.priority === 'urgent' 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.action_url && (
                        <Button size="sm" variant="outline" onClick={() => navigate(notification.action_url!)}>
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/lodge/tourists")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Tourist Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage tourist tree planting requests</p>
              <p className="text-2xl font-bold mt-2">{stats?.pendingTrees || 0} pending</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/lodge/trees")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="w-5 h-5 text-green-600" />
                My Trees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage trees and upload photos</p>
              <p className="text-2xl font-bold mt-2">{stats?.totalTrees || 0}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/lodge/reimbursements")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Reimbursements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Submit and track reimbursement requests</p>
              <p className="text-2xl font-bold mt-2">${stats?.totalEarnings || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
