import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface ContributionTreesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contributionId: string | null;
  trees: Tree[];
  transitionDates: Record<string, string>;
  onTrack: (tree: Tree) => void;
}

const STAGE_LABELS: Record<string, string> = {
  planted: "Planted",
  verified: "Planted",
  being_mapped: "Planted",
  sapling_planted: "Planted",
  planting_scheduled: "Planting Scheduled",
  assigned: "Assigned",
  site_prepared: "Assigned",
  saplings_ready: "Assigned",
  waiting_to_be_assigned: "Waiting to be Assigned",
};

const STAGE_COLORS: Record<string, string> = {
  Planted: "bg-accent/10 text-accent border-accent/20",
  "Planting Scheduled": "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  Assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Waiting to be Assigned": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};

const SURVIVAL_COLORS: Record<string, string> = {
  Alive: "bg-green-500/10 text-green-700 border-green-500/20",
  Dead: "bg-red-500/10 text-red-700 border-red-500/20",
  Replaced: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Unknown: "bg-muted text-muted-foreground",
};

export const ContributionTreesSheet = ({
  isOpen,
  onClose,
  contributionId,
  trees,
  transitionDates,
  onTrack,
}: ContributionTreesSheetProps) => {
  const [survival, setSurvival] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || trees.length === 0) return;
    const ids = trees.map((t) => t.id);
    supabase
      .from("tree_survival_records")
      .select("tree_id, survival_status, last_checked_date")
      .in("tree_id", ids)
      .order("last_checked_date", { ascending: false })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((r) => {
          if (r.tree_id && !map[r.tree_id] && r.survival_status) {
            map[r.tree_id] = r.survival_status as string;
          }
        });
        setSurvival(map);
      });
  }, [isOpen, trees]);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tree Details</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Contribution {contributionId}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Tree ID</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Planting Status</TableHead>
                <TableHead className="text-xs">Status Dt</TableHead>
                <TableHead className="text-xs">Survival Status</TableHead>
                <TableHead className="text-xs text-right">Track</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trees.map((tree) => {
                const stageKey = STAGE_LABELS[tree.planting_status as string] || "Waiting to be Assigned";
                const statusDt = transitionDates[tree.id] || tree.updated_at || tree.created_at;
                const surv = survival[tree.id] || "Unknown";
                return (
                  <TableRow key={tree.id}>
                    <TableCell className="font-mono text-xs">{tree.otot_id}</TableCell>
                    <TableCell className="text-xs">Mau Forest Complex</TableCell>
                    <TableCell>
                      <Badge className={`${STAGE_COLORS[stageKey]} text-[11px]`}>{stageKey}</Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {format(new Date(statusDt), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${SURVIVAL_COLORS[surv] || SURVIVAL_COLORS.Unknown} text-[11px]`}>
                        {surv}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onTrack(tree)}
                        title="Track this tree"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
};
