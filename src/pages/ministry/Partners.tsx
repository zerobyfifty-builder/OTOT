import { useStore } from "@/contexts/StoreContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MinistryPartners() {
  const { state } = useStore();
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantation partners</h1>
        <p className="text-muted-foreground mt-1">Vendors that receive assigned plantation requests.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Open requests</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.region}</TableCell>
                  <TableCell>{state.vendorAgents.filter((a) => a.vendorId === v.id).length}</TableCell>
                  <TableCell>
                    {
                      state.plantationRequests.filter(
                        (r) => r.partnerId === v.id && r.status !== "completed",
                      ).length
                    }
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
