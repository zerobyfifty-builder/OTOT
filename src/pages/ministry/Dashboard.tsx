import { ClipboardList, Landmark, Leaf, TreePine, Wallet } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { AccentStatCard, EmptyState, PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MinistryDashboard() {
  const { state } = useStore();
  const paid = state.donations.filter((d) => d.status === "paid");
  const open = state.plantationRequests.filter((r) => r.status !== "completed");
  const ready = state.plantationRequests.filter((r) => r.status === "ready_for_review");
  const paidOut = state.plantationPayouts.filter((p) => p.payoutStatus === "paid");
  const paidTrees = paid.reduce((s, d) => s + treeCount(d.trees), 0);
  const inFlight = state.plantationPayouts.filter((p) => p.payoutStatus === "pending" || p.payoutStatus === "processing");

  return (
    <PortalPage
      tone="ministry"
      title="Ministry"
      subtitle="Turn paid donations into plantation requests, assign partners, and release payouts."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AccentStatCard
          label="Paid donations"
          value={paid.length}
          icon={Wallet}
          accent={{ border: "border-l-primary", icon: "text-primary" }}
          breakdown={[
            { label: "Amount", value: usd(paid.reduce((s, d) => s + d.amount, 0)) },
            { label: "Trees", value: paidTrees, highlight: true },
          ]}
        />
        <AccentStatCard
          label="CO₂ pledged"
          value={kg(paid.reduce((s, d) => s + d.carbonOffsetKg, 0))}
          icon={Leaf}
          accent={{ border: "border-l-emerald-500", icon: "text-emerald-500" }}
          breakdown={[{ label: "Donations", value: paid.length }]}
        />
        <AccentStatCard
          label="Open requests"
          value={open.length}
          icon={ClipboardList}
          accent={{ border: "border-l-sky-500", icon: "text-sky-500" }}
          breakdown={[
            { label: "Unassigned", value: open.filter((r) => r.status === "unassigned").length },
            { label: "Ready to complete", value: ready.length, highlight: true },
          ]}
        />
        <AccentStatCard
          label="Payouts"
          value={usd(paidOut.reduce((s, p) => s + p.amount, 0))}
          icon={Landmark}
          accent={{ border: "border-l-violet-500", icon: "text-violet-500" }}
          breakdown={[
            { label: "Paid", value: paidOut.length },
            { label: "In flight", value: inFlight.length },
          ]}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {state.plantationRequests.length === 0 ? (
            <EmptyState icon={TreePine} message="No plantation requests yet." />
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.plantationRequests.slice(0, 8).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{shortDate(r.createdAt)}</TableCell>
                      <TableCell className="font-medium">
                        {state.vendors.find((v) => v.id === r.partnerId)?.name || "Unassigned"}
                      </TableCell>
                      <TableCell>{usd(r.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
