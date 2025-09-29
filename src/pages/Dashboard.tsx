import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Plane, 
  TreePine, 
  Award, 
  DollarSign, 
  Calendar,
  Plus,
  Download,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface UserStats {
  totalTrips: number;
  totalTrees: number;
  totalDonation: number;
  pledgeStatus: boolean;
  pledgeDate: string | null;
  certificates: number;
}

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTrips: 0,
    totalTrees: 0,
    totalDonation: 0,
    pledgeStatus: false,
    pledgeDate: null,
    certificates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('pledge_status, pledge_date, total_donation')
        .eq('user_id', user.id)
        .single();

      // Fetch trips count
      const { count: tripsCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch trees count
      const { data: trees } = await supabase
        .from('trees')
        .select('num_trees')
        .eq('user_id', user.id);

      const totalTrees = trees?.reduce((sum, tree) => sum + tree.num_trees, 0) || 0;

      // Fetch certificates count
      const { count: certificatesCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        totalTrips: tripsCount || 0,
        totalTrees,
        totalDonation: profile?.total_donation || 0,
        pledgeStatus: profile?.pledge_status || false,
        pledgeDate: profile?.pledge_date || null,
        certificates: certificatesCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                Trips logged
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trees Planted</CardTitle>
              <TreePine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrees}</div>
              <p className="text-xs text-muted-foreground">
                Making a difference
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalDonation}</div>
              <p className="text-xs text-muted-foreground">
                Invested in our planet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.certificates}</div>
              <p className="text-xs text-muted-foreground">
                Impact certificates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pledge Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Carbon Offset Pledge
              {stats.pledgeStatus ? (
                <Badge variant="default" className="bg-primary/10 text-primary">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Not Active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {stats.pledgeStatus 
                ? `You made your pledge on ${new Date(stats.pledgeDate!).toLocaleDateString()}`
                : 'Take the pledge to offset your carbon footprint'
              }
            </CardDescription>
          </CardHeader>
          {!stats.pledgeStatus && (
            <CardContent>
              <Button className="w-full sm:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                Take the Pledge
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/carbon-calculator">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Calculate New Trip
                </CardTitle>
                <CardDescription>
                  Add a new trip and calculate its carbon footprint
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/my-trips">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  View My Trips
                </CardTitle>
                <CardDescription>
                  See all your logged trips and their impact
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/my-trees">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  View My Trees
                </CardTitle>
                <CardDescription>
                  Track your planted trees and their status
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/tree-purchase">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Purchase Trees
                </CardTitle>
                <CardDescription>
                  Buy trees to offset your carbon footprint
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/certificates">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Certificates
                </CardTitle>
                <CardDescription>
                  Get your impact certificates and documentation
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/profile">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Manage Profile
                </CardTitle>
                <CardDescription>
                  Update your account settings and preferences
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};