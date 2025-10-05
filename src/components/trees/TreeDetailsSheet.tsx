import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Leaf, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tree = Database["public"]["Tables"]["trees"]["Row"];
type PurchaseType = Database["public"]["Enums"]["purchase_type"];

interface TreeDetailsSheetProps {
  tripId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  "One-time": "One-time",
  "Subscription": "Monthly",
};

export const TreeDetailsSheet = ({ tripId, isOpen, onClose }: TreeDetailsSheetProps) => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tripId && isOpen) {
      fetchTrees();
    }
  }, [tripId, isOpen]);

  const fetchTrees = async () => {
    if (!tripId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrees(data || []);
    } catch (error) {
      console.error("Error fetching trees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalTrees = trees.reduce((sum, tree) => sum + tree.num_trees, 0);
  const totalAmount = trees.reduce((sum, tree) => sum + Number(tree.amount_paid), 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Trees Planted for This Trip</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-medium">Total Trees Planted:</span>
              </div>
              <span className="text-2xl font-bold text-primary">{totalTrees}</span>
            </div>
          </div>

          {/* Trees Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading trees...</p>
            </div>
          ) : trees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trees planted yet for this trip.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Trees</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trees.map((tree) => (
                    <TableRow key={tree.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(tree.created_at), "dd MMM yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(tree.created_at), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tree.purchase_type === "One-time" ? "default" : "secondary"}>
                          {PURCHASE_TYPE_LABELS[tree.purchase_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {tree.num_trees}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(tree.amount_paid).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{totalTrees}</TableCell>
                    <TableCell className="text-right">${totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
