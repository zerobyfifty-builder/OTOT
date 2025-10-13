import { useNavigate } from "react-router-dom";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { lodge, signOut } = useLodgeAuth();

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['lodge-stats', lodge?.id],
    queryFn: async () => {
      const { data: trees } = await supabase
        .from('trees')
        .select('*')
        .eq('lodge_id', lodge?.id);

      const { data: reimbursements } = await supabase
        .from('reimbursements')
        .select('*')
        .eq('lodge_id', lodge?.id);

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
    enabled: !!lodge,
  });

  // Fetch upcoming tourists (mock data - would come from bookings)
  const upcomingTourists = [
    { name: "Jane Doe", checkIn: "Oct 15", trees: 2, preferences: "Indigenous species", id: "1" },
    { name: "Mike Chen", checkIn: "Oct 16", trees: 1, preferences: "Fast-growing", id: "2" },
    { name: "Sarah Jones", checkIn: "Oct 18", trees: 3, preferences: "Fruit trees", id: "3" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/lodge/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <TreePine className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{lodge?.name}</h1>
              <p className="text-sm text-gray-600">{lodge?.location}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {lodge?.name}! 🌳</h2>
          <p className="text-gray-600 mt-1">Here's what's happening with your trees today</p>
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
                  <span>Tourists to assign:</span>
                  <span className="font-semibold">{upcomingTourists.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Photos to upload:</span>
                  <span className="font-semibold">5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Updates due:</span>
                  <span className="font-semibold text-red-600">7</span>
                </div>
              </div>
              <Badge variant="destructive" className="w-full justify-center">Action Required</Badge>
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
              Priority Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Tourist Arrivals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  🔔 New Tourist Arrivals ({upcomingTourists.length})
                </h3>
                <Button variant="link" size="sm">View All</Button>
              </div>
              <div className="space-y-2">
                {upcomingTourists.map((tourist) => (
                  <div key={tourist.id} className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{tourist.name}</p>
                      <p className="text-sm text-gray-600">Check-in: {tourist.checkIn} • Trees: {tourist.trees}</p>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  ⏰ Pending Actions (12)
                </h3>
                <Button variant="link" size="sm">View Tasks</Button>
              </div>
              <div className="space-y-2">
                {["5 trees need photos uploaded", "3 tree statuses need updating", "2 reimbursement requests ready", "2 tourists arriving tomorrow"].map((task, i) => (
                  <div key={i} className="p-3 bg-orange-50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Completions */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                ✅ Recent Completions
              </h3>
              <div className="space-y-2">
                {["Tree OTOT-2024-12345 status updated", "Reimbursement REI-789 approved ($150)", "3 photos uploaded successfully"].map((item, i) => (
                  <div key={i} className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Tabs */}
        <Tabs defaultValue="tourists" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tourists">Tourist Assignments</TabsTrigger>
            <TabsTrigger value="trees">My Trees</TabsTrigger>
            <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
          </TabsList>

          <TabsContent value="tourists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Arrivals</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tourist</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Trees</TableHead>
                      <TableHead>Preferences</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingTourists.map((tourist) => (
                      <TableRow key={tourist.id}>
                        <TableCell className="font-medium">{tourist.name}</TableCell>
                        <TableCell>{tourist.checkIn}</TableCell>
                        <TableCell>{tourist.trees}</TableCell>
                        <TableCell>{tourist.preferences}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">Prepare</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trees">
            <Card>
              <CardHeader>
                <CardTitle>Tree Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TreePine className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <p className="text-gray-600 mb-4">Manage your trees and track their growth</p>
                  <Button onClick={() => navigate("/lodge/trees")}>
                    View All Trees
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reimbursements">
            <Card>
              <CardHeader>
                <CardTitle>Reimbursements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600 mb-4">Submit and track reimbursement requests</p>
                  <Button onClick={() => navigate("/lodge/reimbursements")}>
                    Manage Reimbursements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Navigation */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigate("/lodge/performance")}
            className="h-auto py-6 flex-col gap-2"
          >
            <Star className="w-8 h-8 text-purple-600" />
            <span className="font-semibold">View Performance</span>
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigate("/lodge/help")}
            className="h-auto py-6 flex-col gap-2"
          >
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <span className="font-semibold">Help & Support</span>
          </Button>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button size="lg" className="rounded-full w-14 h-14 shadow-lg" onClick={() => navigate("/lodge/trees")}>
          <CameraIcon className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
