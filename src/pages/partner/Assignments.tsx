import { ListChecks, TreePine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, treeCount, usd } from "@/lib/format";
import { EmptyState, KpiTile, PortalPage } from "@/components/portal/PortalUI";
import { KPI_TINTS } from "@/components/portal/tints";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VendorRequestStatus } from "@/types/otot";

const NEXT: Record<VendorRequestStatus, VendorRequestStatus | null> = {
  assigned: "in_progress",
  in_progress: "completed",
  completed: null,
};

export default function PartnerAssignments() {
  const { session } = useAuth();
  const { state, updateVendorRequestStatus } = useStore();
  const mine = state.vendorPlantationRequests.filter((v) =>
    session?.role === "partner_admin"
      ? v.vendorId === session.vendorId
      : v.assignedAgentId === session?.userId,
  );

  return (
    <PortalPage tone="partner" icon={ListChecks} title={session?.role === "partner_admin" ? "Team assignments" : "My assignments"} subtitle="Update status as planting work moves.">
      <div className="grid grid-cols-3 gap-3">
        <KpiTile label="Assigned" value={mine.filter((v) => v.status === "assigned").length} tint={KPI_TINTS[0]} />
        <KpiTile label="In progress" value={mine.filter((v) => v.status === "in_progress").length} tint={KPI_TINTS[1]} delay={80} />
        <KpiTile label="Completed" value={mine.filter((v) => v.status === "completed").length} tint={KPI_TINTS[3]} delay={160} />
      </div>

      {mine.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={ListChecks} message="Nothing assigned yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mine.map((v) => {
            const request = state.plantationRequests.find((r) => r.id === v.plantationRequestId);
            const donations = state.donations.filter((d) => request?.donationIds.includes(d.id));
            const next = NEXT[v.status];
            return (
              <Card key={v.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TreePine className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {donations.length ? `${donations.reduce((total, d) => total + treeCount(d.trees), 0)} trees` : "Plantation"}
                      </CardTitle>
                      <CardDescription>
                        {request ? usd(request.amount) : ""} · Assigned {shortDate(v.createdAt)}
                        {session?.role === "partner_admin" && ` · ${state.users.find((u) => u.id === v.assignedAgentId)?.name ?? "Agent"}`}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={v.status} />
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground truncate">
                    {donations.flatMap((d) => d.trees.map((t) => `${t.count} × ${t.treeType}`)).join(", ")}
                  </span>
                  {next && (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={async () => {
                        try {
                          await updateVendorRequestStatus(v.id, next);
                          toast.success(`Marked ${next.replace(/_/g, " ")}`);
                        } catch (err) {
                          toast.error(apiErrorMessage(err));
                        }
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
      )}
    </PortalPage>
  );
}
