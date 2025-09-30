import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreePine, Users, Clock, DollarSign, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TouristNotifications } from "@/components/lodge/TouristNotifications";

export const LodgeDashboard = () => {
  const { lodge, signOut } = useLodgeAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['lodge-stats', lodge?.id],
    queryFn: async () => {
      if (!lodge) return null;

      const [treesResult, reimbursementsResult] = await Promise.all([
        supabase
          .from('trees')
          .select('*', { count: 'exact' })
          .eq('lodge_id', lodge.id),
        supabase
          .from('reimbursements')
          .select('*')
          .eq('lodge_id', lodge.id)
      ]);

      const pendingTrees = treesResult.data?.filter(t => t.status === 'Waiting to be Assigned').length || 0;
      const plantedTrees = treesResult.data?.filter(t => t.status === 'Planted').length || 0;
      const pendingReimbursements = reimbursementsResult.data?.filter(r => r.status === 'pending').length || 0;

      return {
        totalTrees: treesResult.count || 0,
        pendingTrees,
        plantedTrees,
        pendingReimbursements,
      };
    },
    enabled: !!lodge,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/lodge/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{lodge?.name}</h1>
            <p className="text-sm text-muted-foreground">{lodge?.location}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trees</CardTitle>
              <TreePine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTrees || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Planting</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingTrees || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trees Planted</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.plantedTrees || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reimbursements</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingReimbursements || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tourists" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tourists">Tourist Notifications</TabsTrigger>
            <TabsTrigger value="trees">My Trees</TabsTrigger>
            <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
          </TabsList>

          <TabsContent value="tourists">
            <TouristNotifications lodgeId={lodge?.id || ''} />
          </TabsContent>

          <TabsContent value="trees">
            <Card>
              <CardHeader>
                <CardTitle>Tree Management</CardTitle>
                <CardDescription>View and update trees planted by your lodge</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/lodge/trees')}>
                  Manage Trees
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reimbursements">
            <Card>
              <CardHeader>
                <CardTitle>Reimbursement Requests</CardTitle>
                <CardDescription>Submit and track your reimbursement requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/lodge/reimbursements')}>
                  Manage Reimbursements
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
