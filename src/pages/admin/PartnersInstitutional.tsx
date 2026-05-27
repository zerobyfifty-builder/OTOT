import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft, ExternalLink, RefreshCw, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  contact_person?: string;
  website?: string;
  onboarded_date?: string;
  partner_types?: {
    name: string;
    category: string;
  };
}

export default function PartnersInstitutional() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ["institutional-partners", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("organizations")
        .select(`
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
          contact_person,
          website,
          onboarded_date,
          partner_types(name, category)
        `)
        .eq("category", "government")
        .eq("archived", false); // Exclude archived partners

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch institutional partners");
        throw error;
      }
      return data as Partner[];
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/partners")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-admin-primary">Government Partners</h1>
          <p className="text-muted-foreground mt-1">
            Tourism boards, conservation organizations, and government agencies
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => navigate("/admin/partners/create")} className="gap-2">
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
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </div>
          ) : partners && partners.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          {partner.website && (
                            <a
                              href={partner.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
                            >
                              {partner.website}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{partner.contact_person || "-"}</p>
                          <p className="text-muted-foreground">{partner.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant={partner.is_active ? "default" : "secondary"}>
                            {partner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {partner.verified && (
                            <Badge variant="outline">Verified</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.has_api_access ? "default" : "secondary"}>
                          {partner.has_api_access ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {partner.onboarded_date
                          ? new Date(partner.onboarded_date).toLocaleDateString()
                          : new Date(partner.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <PartnerActionsMenu 
                          partner={partner} 
                          onUpdate={() => refetch()}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No institutional partners found.</p>
              <Button
                onClick={() => navigate("/admin/partners/create")}
                className="mt-4"
              >
                Create Your First Partner
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
