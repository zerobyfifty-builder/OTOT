import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PlantationPartners() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ["plantation-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          id,
          name,
          legal_name,
          category,
          contact_email,
          contact_phone,
          contact_person,
          website,
          is_active,
          verified,
          onboarded_date,
          partner_types(name, category)
        `)
        .in("category", ["stakeholder", "business"])
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch planting progress per partner
  const { data: treeStats } = useQuery({
    queryKey: ["partnerTreeStats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("stakeholder_org_id, num_trees, planting_status")
        .not("stakeholder_org_id", "is", null);
      if (error) throw error;
      
      const grouped: Record<string, { total: number; planted: number }> = {};
      data?.forEach(t => {
        const key = t.stakeholder_org_id!;
        if (!grouped[key]) grouped[key] = { total: 0, planted: 0 };
        grouped[key].total += t.num_trees;
        if (t.planting_status === 'planted' || t.planting_status === 'monitored') {
          grouped[key].planted += t.num_trees;
        }
      });
      return grouped;
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plantation Partners</h1>
        <p className="text-muted-foreground mt-1">
          All registered plantation and business partners with planting progress
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : partners && partners.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            {partner.website && (
                              <a
                                href={partner.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                Visit website
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {partner.partner_types?.name || 'Business Partner'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {partner.contact_person && (
                            <p className="font-medium">{partner.contact_person}</p>
                          )}
                          {partner.contact_email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{partner.contact_email}</span>
                            </div>
                          )}
                          {partner.contact_phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{partner.contact_phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant={partner.is_active ? "default" : "secondary"}>
                            {partner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {partner.verified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {partner.onboarded_date
                          ? new Date(partner.onboarded_date).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No business partners found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
