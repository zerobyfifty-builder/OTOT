import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, TreePine, User, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TreeWithUser {
  id: string;
  user_id: string;
  num_trees: number;
  tree_type: string | null;
  status: string;
  created_at: string;
  purchase_type: string;
  user?: {
    user_id: string;
    email: string;
    otot_id: string | null;
  };
}

export const LodgeTourists = () => {
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

  const { data: trees, isLoading } = useQuery<TreeWithUser[]>({
    queryKey: ['lodge-tourist-trees', userOrg],
    queryFn: async () => {
      const { data: treesData, error } = await supabase
        .from('trees')
        .select('*')
        .eq('lodge_id', userOrg)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!treesData) return [];

      // Fetch user data separately
      const userIds = [...new Set(treesData.map(t => t.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, email, otot_id')
        .in('user_id', userIds);

      // Combine data
      return treesData.map(tree => ({
        ...tree,
        user: usersData?.find(u => u.user_id === tree.user_id),
      })) as TreeWithUser[];
    },
    enabled: !!userOrg,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Waiting to be Assigned': 'secondary',
      'Planted': 'default',
      'Updated': 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/lodge/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tourist Assignments</h1>
            <p className="text-muted-foreground">Manage tree planting requests from tourists</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tree Planting Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {!trees || trees.length === 0 ? (
              <div className="text-center py-12">
                <TreePine className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">No tree planting requests yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tourist assignments will appear here when tourists select your lodge
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tourist</TableHead>
                      <TableHead>OTOT ID</TableHead>
                      <TableHead>Trees</TableHead>
                      <TableHead>Tree Type</TableHead>
                      <TableHead>Purchase Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trees.map((tree) => (
                      <TableRow key={tree.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {tree.user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tree.user?.otot_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TreePine className="w-4 h-4 text-primary" />
                            {tree.num_trees}
                          </div>
                        </TableCell>
                        <TableCell>{tree.tree_type || 'Any'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tree.purchase_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(tree.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(tree.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/lodge/plant-tree/${tree.id}`)}
                          >
                            {tree.status === 'Waiting to be Assigned' ? 'Plant Tree' : 'Update'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};