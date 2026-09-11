import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
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

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Donations</h1>
        <p className="text-muted-foreground mt-1">
          Each plantation request maps 1:1 to a donation in this preview.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Paid donations</CardTitle>
        </CardHeader>
        <CardContent>
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
              {state.donations
                .filter((d) => d.status === "paid")
                .map((d) => {
                  const request = state.plantationRequests.find((r) => r.donationId === d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{shortDate(d.createdAt)}</TableCell>
                      <TableCell>{treeCount(d.trees)}</TableCell>
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
                                onClick={() => {
                                  createPlantationRequest({
                                    donationId: d.id,
                                    partnerId: partnerByDonation[d.id] || undefined,
                                  });
                                  toast.success("Plantation request created");
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
        </CardContent>
      </Card>
    </div>
  );
}
