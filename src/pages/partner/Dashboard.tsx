import { ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { shortDate, treeCount, usd } from "@/lib/format";
import { EmptyState, KpiTile, SoftCard, TableFrame } from "@/components/portal/PortalUI";
import { KPI_TINTS } from "@/components/portal/tints";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PartnerDashboard() {
  const { session } = useAuth();
  const { state } = useStore();
  const vendorId = session?.vendorId;
  const vendor = state.vendors.find((v) => v.id === vendorId);
  const requests = state.plantationRequests.filter((r) => r.partnerId === vendorId);
  const vprs = state.vendorPlantationRequests.filter((v) => v.vendorId === vendorId);
  const payouts = state.plantationPayouts.filter((p) =>
    requests.some((r) => r.id === p.plantationRequestId),
  );
  const treesInQueue = requests.reduce((s, r) => {
    return s + state.donations.filter((d) => r.donationIds.includes(d.id))
      .reduce((total, d) => total + treeCount(d.trees), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 md:p-8 space-y-5">
        <div className="animate-fade-in">
          <h1 className="text-[26px] font-semibold text-foreground mt-0.5">
            Welcome, {vendor?.name || "Partner dashboard"}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5">
            {session?.name && <>Logged in as {session.name} · </>}
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Assign ministry requests to agents, then complete them in the field.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label="Assigned requests" value={requests.length} tint={KPI_TINTS[0]} delay={0} />
          <KpiTile
            label="In progress"
            value={vprs.filter((v) => v.status !== "completed").length}
            tint={KPI_TINTS[1]}
            delay={80}
          />
          <KpiTile label="Trees in queue" value={treesInQueue} tint={KPI_TINTS[2]} delay={160} />
          <KpiTile label="Payouts" value={usd(payouts.reduce((s, p) => s + p.amount, 0))} tint={KPI_TINTS[3]} delay={240} />
        </div>

        <SoftCard>
          <div className="p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-foreground">Incoming from ministry</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Plantation requests assigned to your organisation</p>
            </div>
            {requests.length === 0 ? (
              <EmptyState icon={ClipboardList} message="No requests assigned yet." />
            ) : (
              <TableFrame>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Received</TableHead>
                      <TableHead>Trees</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => {
                      const donations = state.donations.filter((d) => r.donationIds.includes(d.id));
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{shortDate(r.createdAt)}</TableCell>
                          <TableCell className="font-medium">{donations.reduce((total, d) => total + treeCount(d.trees), 0)}</TableCell>
                          <TableCell>{usd(r.amount)}</TableCell>
                          <TableCell>
                            <StatusBadge status={r.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableFrame>
            )}
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
