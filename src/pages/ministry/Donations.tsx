import { useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
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

export default function MinistryDonations() {
  const { session } = useAuth();
  const { state, createPlantationRequest } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const [partnerByDonation, setPartnerByDonation] = useState<Record<string, string>>({});
  const paid = state.donations.filter((d) => d.status === "paid");

  return (
    <PortalPage
      tone="ministry"
      title="Donations"
      subtitle="Paid donations are automatically queued and can be grouped before partner assignment."
    >
      <Card>
        <CardHeader>
          <CardTitle>Paid donations</CardTitle>
        </CardHeader>
        <CardContent>
          {paid.length === 0 ? (
            <EmptyState icon={Wallet} message="No paid donations yet." />
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Offset</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Request</TableHead>
                    {canWrite && <TableHead>Assign partner</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paid.map((d) => {
                    const request = state.plantationRequests.find((r) => r.donationIds.includes(d.id));
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{shortDate(d.createdAt)}</TableCell>
                        <TableCell className="font-medium">{treeCount(d.trees)}</TableCell>
                        <TableCell>{kg(d.carbonOffsetKg)}</TableCell>
                        <TableCell>{usd(d.amount)}</TableCell>
                        <TableCell>
                          {request ? <StatusBadge status={request.status} /> : "—"}
                        </TableCell>
                        {canWrite && (
                          <TableCell>
                            {request ? (
                              <span className="text-xs text-muted-foreground">Already created</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={partnerByDonation[d.id] || ""}
                                  onValueChange={(v) =>
                                    setPartnerByDonation((p) => ({ ...p, [d.id]: v }))
                                  }
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Partner" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {state.vendors.map((v) => (
                                      <SelectItem key={v.id} value={v.id}>
                                        {v.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await createPlantationRequest({
                                        donationId: d.id,
                                        partnerId: partnerByDonation[d.id] || undefined,
                                      });
                                      toast.success("Plantation request created");
                                    } catch (err) {
                                      toast.error(apiErrorMessage(err));
                                    }
                                  }}
                                >
                                  Create request
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
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
