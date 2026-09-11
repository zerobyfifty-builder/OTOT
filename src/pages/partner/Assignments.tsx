import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { shortDate, treeCount, usd } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VendorRequestStatus } from "@/types/otot";

const NEXT: Record<VendorRequestStatus, VendorRequestStatus | null> = {
  assigned: "in_progress",
  in_progress: "completed",
  completed: null,
};

export default function PartnerAssignments() {
  const { session } = useAuth();
  const { state, updateVendorRequestStatus } = useStore();
  const mine = state.vendorPlantationRequests.filter((v) => v.assignedAgentId === session?.userId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My assignments</h1>
        <p className="text-muted-foreground mt-1">Update status as planting work moves.</p>
      </div>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">Nothing assigned yet.</p>}
      {mine.map((v) => {
        const request = state.plantationRequests.find((r) => r.id === v.plantationRequestId);
        const donation = state.donations.find((d) => d.id === request?.donationId);
        const next = NEXT[v.status];
        return (
          <Card key={v.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {donation ? `${treeCount(donation.trees)} trees` : "Plantation"} · {request ? usd(request.amount) : ""}
              </CardTitle>
              <StatusBadge status={v.status} />
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assigned {shortDate(v.createdAt)}</span>
              {next && (
                <Button
                  size="sm"
                  onClick={() => {
                    updateVendorRequestStatus(v.id, next);
                    toast.success(`Marked ${next.replace(/_/g, " ")}`);
                  }}
                >
                  Mark {next.replace(/_/g, " ")}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
