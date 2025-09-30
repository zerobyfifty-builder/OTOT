import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, TreePine, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TouristNotificationsProps {
  lodgeId: string;
}

export const TouristNotifications = ({ lodgeId }: TouristNotificationsProps) => {
  const navigate = useNavigate();

  const { data: trees, isLoading } = useQuery({
    queryKey: ['lodge-tourist-trees', lodgeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trees')
        .select(`
          *,
          users (
            email,
            otot_id
          )
        `)
        .eq('lodge_id', lodgeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lodgeId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Waiting to be Assigned': 'secondary',
      'Planted': 'default',
      'Updated': 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tourist Tree Planting Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {!trees || trees.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tree planting requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tourist</TableHead>
                  <TableHead>OTOT ID</TableHead>
                  <TableHead>Trees</TableHead>
                  <TableHead>Tree Type</TableHead>
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
                        {Array.isArray(tree.users) ? tree.users[0]?.email : tree.users?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(tree.users) ? tree.users[0]?.otot_id : tree.users?.otot_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TreePine className="w-4 h-4 text-primary" />
                        {tree.num_trees}
                      </div>
                    </TableCell>
                    <TableCell>{tree.tree_type || 'Any'}</TableCell>
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
  );
};
