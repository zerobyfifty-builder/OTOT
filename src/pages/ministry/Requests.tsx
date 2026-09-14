import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, usd } from "@/lib/format";
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
import { useState } from "react";

export default function MinistryRequests() {
  const { session } = useAuth();
  const { state, assignPlantationRequest, markPlantationComplete } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const [partnerPick, setPartnerPick] = useState<Record<string, string>>({});

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantation requests</h1>
        <p className="text-muted-foreground mt-1">
          Mark complete only after every vendor plantation request is completed.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Vendor work</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.plantationRequests.map((r) => {
                const vendor = state.vendors.find((v) => v.id === r.partnerId);
                const vprs = state.vendorPlantationRequests.filter((v) => v.plantationRequestId === r.id);
                const allDone = vprs.length > 0 && vprs.every((v) => v.status === "completed");
                return (
                  <TableRow key={r.id}>
                    <TableCell>{shortDate(r.createdAt)}</TableCell>
                    <TableCell>{usd(r.amount)}</TableCell>
                    <TableCell>{vendor?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      {vprs.length === 0
                        ? "None yet"
                        : `${vprs.filter((v) => v.status === "completed").length}/${vprs.length} complete`}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    {canWrite && (
                      <TableCell className="space-x-2">
                        {r.status === "unassigned" && (
                          <>
                            <Select
                              value={partnerPick[r.id] || ""}
                              onValueChange={(v) => setPartnerPick((p) => ({ ...p, [r.id]: v }))}
                            >
                              <SelectTrigger className="w-40 inline-flex">
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
                              variant="outline"
                              onClick={async () => {
                                const pid = partnerPick[r.id];
                                const admin = state.users.find(
                                  (u) => u.vendorId === pid && u.role === "partner_admin",
                                );
                                if (!pid || !admin) {
                                  toast.error("Pick a partner with an admin");
                                  return;
                                }
                                try {
                                  await assignPlantationRequest(r.id, pid, admin.id);
                                  toast.success("Assigned");
                                } catch (err) {
                                  toast.error(apiErrorMessage(err));
                                }
                              }}
                            >
                              Assign
                            </Button>
                          </>
                        )}
                        {r.status === "ready_for_review" && allDone && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await markPlantationComplete(r.id);
                                toast.success("Marked complete");
                              } catch (err) {
                                toast.error(apiErrorMessage(err));
                              }
                            }}
                          >
                            Mark complete
                          </Button>
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
