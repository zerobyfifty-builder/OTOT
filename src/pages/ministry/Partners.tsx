import { Building2, MapPin, Phone } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { EmptyState, PortalPage, TableFrame } from "@/components/portal/PortalUI";
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
    <PortalPage
      tone="ministry"
      title="Plantation Partners"
      subtitle="Vendors that receive assigned plantation requests."
    >
      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardContent>
          {state.vendors.length === 0 ? (
            <EmptyState icon={Building2} message="No plantation partners found." />
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>M-Pesa</TableHead>
                    <TableHead>Agents</TableHead>
                    <TableHead>Open requests</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{v.name}</p>
                            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {v.region}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.mpesaPhone ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="font-mono text-xs">{v.mpesaPhone}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {state.vendorAgents.filter((a) => a.vendorId === v.id).length}
                      </TableCell>
                      <TableCell className="font-medium">
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
            </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
