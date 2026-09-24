import { useMemo } from "react";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { partnerTreeStats } from "@/components/ministry/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MinistryPartners() {
  const { state, loading } = useStore();
  const treeStats = useMemo(() => partnerTreeStats(state), [state]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Plantation Partners</h1>
        <p className="text-muted-foreground mt-1">All registered plantation partners with planting progress</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : state.vendors.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Agents</TableHead>
                    <TableHead>Trees Allocated</TableHead>
                    <TableHead>Trees Planted</TableHead>
                    <TableHead>Open Requests</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.vendors.map((partner) => {
                    const contact = state.users.find(
                      (u) => u.vendorId === partner.id && u.role === "partner_admin",
                    );
                    return (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{partner.name}</p>
                              {partner.region && (
                                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {partner.region}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            Plantation Partner
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {contact && <p className="font-medium">{contact.name}</p>}
                            {contact && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="text-xs">{contact.email}</span>
                              </div>
                            )}
                            {partner.mpesaPhone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span className="text-xs">{partner.mpesaPhone}</span>
                              </div>
                            )}
                            {!contact && !partner.mpesaPhone && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {state.vendorAgents.filter((a) => a.vendorId === partner.id).length}
                        </TableCell>
                        <TableCell className="font-medium">{treeStats[partner.id]?.allocated || 0}</TableCell>
                        <TableCell className="font-medium">{treeStats[partner.id]?.planted || 0}</TableCell>
                        <TableCell className="font-medium">
                          {
                            state.plantationRequests.filter(
                              (r) => r.partnerId === partner.id && r.status !== "completed",
                            ).length
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.status === "active" ? "default" : "secondary"}>
                            {partner.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No plantation partners found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
