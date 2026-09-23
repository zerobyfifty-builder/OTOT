import { CheckCircle2, Clock, DollarSign } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, usd } from "@/lib/format";
import { IconStatCard, PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AdminFinance() {
  const { state } = useStore();
  const successful = state.payments.filter((p) => p.status === "success");
  const pending = state.payments.filter((p) => p.status === "pending");

  return (
    <PortalPage tone="admin" title="Financial Transactions" subtitle="Donations, plantation requests, and payments.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IconStatCard
          label="Collected"
          value={usd(successful.reduce((s, p) => s + p.amount, 0))}
          icon={DollarSign}
          tint={{ bg: "bg-admin-primary/10", fg: "text-admin-primary" }}
        />
        <IconStatCard label="Successful payments" value={successful.length} icon={CheckCircle2} tint={{ bg: "bg-green-100", fg: "text-green-600" }} />
        <IconStatCard label="Pending payments" value={pending.length} icon={Clock} tint={{ bg: "bg-orange-100", fg: "text-orange-600" }} />
      </div>

      <Tabs defaultValue="donations">
        <TabsList>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="donations">
          <Card className="bg-white border-admin-primary/10">
            <CardHeader>
              <CardTitle>Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <TableFrame>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Offset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.donations.length === 0 && <EmptyRow colSpan={4} message="No donations yet." />}
                    {state.donations.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{shortDate(d.createdAt)}</TableCell>
                        <TableCell>{kg(d.carbonOffsetKg)}</TableCell>
                        <TableCell className="font-medium">{usd(d.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableFrame>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="requests">
          <Card className="bg-white border-admin-primary/10">
            <CardHeader>
              <CardTitle>Plantation requests</CardTitle>
            </CardHeader>
            <CardContent>
              <TableFrame>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.plantationRequests.length === 0 && <EmptyRow colSpan={3} message="No plantation requests yet." />}
                    {state.plantationRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{shortDate(r.createdAt)}</TableCell>
                        <TableCell className="font-medium">{usd(r.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableFrame>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          <Card className="bg-white border-admin-primary/10">
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <TableFrame>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.payments.length === 0 && <EmptyRow colSpan={4} message="No payments yet." />}
                    {state.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{shortDate(p.createdAt)}</TableCell>
                        <TableCell>{p.paymentMode}</TableCell>
                        <TableCell className="font-medium">{usd(p.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableFrame>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalPage>
  );
}
