import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, treeCount, usd } from "@/lib/format";
import { ClipboardList } from "lucide-react";
import { EmptyState, PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PartnerRequests() {
  const { session } = useAuth();
  const { state, createVendorPlantationRequest } = useStore();
  const [agentPick, setAgentPick] = useState<Record<string, string>>({});
  const vendorId = session?.vendorId;
  const requests = state.plantationRequests.filter((r) => r.partnerId === vendorId);
  const agents = state.users.filter((u) => u.vendorId === vendorId && u.role === "partner_agent");

  return (
    <PortalPage
      tone="partner"
      icon={ClipboardList}
      title="Plantation Requests"
      subtitle="Create a vendor plantation request and assign it to an agent."
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No plantation requests assigned yet." />
          ) : (
          <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Trees</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Vendor request</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const donations = state.donations.filter((d) => r.donationIds.includes(d.id));
                const vpr = state.vendorPlantationRequests.find((v) => v.plantationRequestId === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{shortDate(r.createdAt)}</TableCell>
                    <TableCell>{donations.reduce((total, d) => total + treeCount(d.trees), 0)}</TableCell>
                    <TableCell>{usd(r.amount)}</TableCell>
                    <TableCell>
                      {vpr ? <StatusBadge status={vpr.status} /> : "Not created"}
                    </TableCell>
                    <TableCell>
                      {!vpr && (
                        <div className="flex gap-2">
                          <Select
                            value={agentPick[r.id] || ""}
                            onValueChange={(v) => setAgentPick((p) => ({ ...p, [r.id]: v }))}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={async () => {
                              const agentId = agentPick[r.id];
                              if (!agentId) {
                                toast.error("Pick an agent");
                                return;
                              }
                              try {
                                await createVendorPlantationRequest(r.id, agentId);
                                toast.success("Assigned to agent");
                              } catch (err) {
                                toast.error(apiErrorMessage(err));
                              }
                            }}
                          >
                            Assign
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
