import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, Search, RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerActionsMenu } from "@/components/admin/PartnerActionsMenu";

interface Partner {
  id: string;
  name: string;
  legal_name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  verified: boolean;
  has_api_access: boolean;
  created_at: string;
  partner_types?: {
    name: string;
    category: string;
  };
}

export default function PartnersBusiness() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPartners();
  }, [searchTerm]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("organizations")
        .select(
          `
          id,
          name,
          legal_name,
          category,
          contact_email,
          contact_phone,
          is_active,
          verified,
          has_api_access,
          created_at,
          partner_types(name, category)
        `
        )
        .eq("category", "business")
        .eq("archived", false); // Exclude archived partners

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to fetch business partners");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/partners")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-admin-primary">
            Business Partners
          </h1>
          <p className="text-muted-foreground mt-1">
            Hotels, lodges, tour operators, and travel agencies
          </p>
        </div>
        <Button onClick={fetchPartners} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => navigate("/admin/partners/create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, legal name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No business partners found.</p>
              <Button
                onClick={() => navigate("/admin/partners/create")}
                className="mt-4"
              >
                Create Your First Partner
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Legal Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>API Access</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        {partner.name}
                      </TableCell>
                      <TableCell>{partner.legal_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {partner.partner_types?.name || "Business"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{partner.contact_email || "-"}</div>
                          <div className="text-muted-foreground">
                            {partner.contact_phone || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge
                            variant={
                              partner.is_active ? "default" : "secondary"
                            }
                          >
                            {partner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {partner.verified && (
                            <Badge variant="outline">Verified</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            partner.has_api_access ? "default" : "secondary"
                          }
                        >
                          {partner.has_api_access ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(partner.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <PartnerActionsMenu
                          partner={partner}
                          onUpdate={fetchPartners}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
