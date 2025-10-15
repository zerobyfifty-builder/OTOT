import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, TreePine, User, MoreVertical, MapPin, CreditCard } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TouristNotificationsProps {
  lodgeId: string;
}

interface TreeWithUser {
  id: string;
  user_id: string;
  num_trees: number;
  tree_type: string | null;
  purchase_type: string | null;
  status: string;
  created_at: string;
  otot_id: string;
  amount_paid: number;
  user?: {
    user_id: string;
    email: string;
    otot_id: string | null;
  };
}

export const TouristNotifications = ({ lodgeId }: TouristNotificationsProps) => {
  const navigate = useNavigate();
  const [selectedTree, setSelectedTree] = useState<TreeWithUser | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: trees, isLoading } = useQuery<TreeWithUser[]>({
    queryKey: ['lodge-tourist-trees', lodgeId],
    queryFn: async () => {
      const { data: treesData, error } = await supabase
        .from('trees')
        .select('id, user_id, num_trees, tree_type, purchase_type, status, created_at, otot_id, amount_paid')
        .eq('lodge_id', lodgeId)
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
    enabled: !!lodgeId,
  });

  const handleViewDetails = (tree: TreeWithUser) => {
    setSelectedTree(tree);
    setIsSheetOpen(true);
  };

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
    <>
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
                    <TableHead>OTOT ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trees.map((tree) => (
                    <TableRow key={tree.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{tree.otot_id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {tree.user?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>Kenya</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm">{new Date(tree.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground">{new Date(tree.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TreePine className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{tree.num_trees}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tree.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(tree)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/lodge/plant-tree/${tree.id}`)}>
                              {tree.status === 'Waiting to be Assigned' ? 'Plant Tree' : 'Update'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tree Planting Request Details</SheetTitle>
            <SheetDescription>
              Complete information about this tree planting request
            </SheetDescription>
          </SheetHeader>
          
          {selectedTree && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">OTOT ID</p>
                    <p className="font-mono text-sm font-medium">{selectedTree.otot_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedTree.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tourist Email</p>
                    <p className="text-sm font-medium">{selectedTree.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="text-sm font-medium">Kenya</p>
                  </div>
                </div>
              </div>

              {/* Tree Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tree Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Trees</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TreePine className="w-4 h-4 text-primary" />
                      <p className="font-semibold">{selectedTree.num_trees}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tree Type</p>
                    <p className="text-sm font-medium">{selectedTree.tree_type || 'Any'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Type</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium capitalize">{selectedTree.purchase_type || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="text-sm font-medium">${selectedTree.amount_paid.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Request Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedTree.created_at).toLocaleDateString()} at{' '}
                        {new Date(selectedTree.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setIsSheetOpen(false);
                    navigate(`/lodge/plant-tree/${selectedTree.id}`);
                  }}
                >
                  {selectedTree.status === 'Waiting to be Assigned' ? 'Plant Tree' : 'Update Tree'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
