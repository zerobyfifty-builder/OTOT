import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, TreePine } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const LodgeTrees = () => {
  const { lodge } = useLodgeAuth();
  const navigate = useNavigate();

  const { data: trees, isLoading } = useQuery({
    queryKey: ['lodge-all-trees', lodge?.id],
    queryFn: async () => {
      if (!lodge) return [];

      const { data, error } = await supabase
        .from('trees')
        .select(`
          *,
          users (
            email,
            otot_id
          )
        `)
        .eq('lodge_id', lodge.id)
        .order('plant_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lodge,
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
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/lodge/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>All Trees</CardTitle>
          </CardHeader>
          <CardContent>
            {!trees || trees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No trees yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tree Type</TableHead>
                      <TableHead>Tourist</TableHead>
                      <TableHead>Plant Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trees.map((tree) => (
                      <TableRow key={tree.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TreePine className="w-4 h-4 text-primary" />
                            {tree.tree_type || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {Array.isArray(tree.users) ? tree.users[0]?.email : tree.users?.email}
                        </TableCell>
                        <TableCell>
                          {tree.plant_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {new Date(tree.plant_date).toLocaleDateString()}
                            </div>
                          ) : (
                            'Not planted'
                          )}
                        </TableCell>
                        <TableCell>
                          {tree.location_name || (
                            tree.latitude && tree.longitude ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
                              </div>
                            ) : (
                              'No location'
                            )
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(tree.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/lodge/plant-tree/${tree.id}`)}
                          >
                            Update
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
