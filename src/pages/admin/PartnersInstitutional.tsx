import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PartnersInstitutional() {
  const navigate = useNavigate();

  const { data: partners, isLoading } = useQuery({
    queryKey: ["institutional-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("category", "institutional")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/partners")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-admin-primary">Institutional Partners</h1>
          <p className="text-muted-foreground mt-1">
            Tourism boards, conservation organizations, and government agencies
          </p>
        </div>
        <Button onClick={() => navigate("/admin/partners/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institutional Partners List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : partners && partners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API Access</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <p>{partner.contact_person}</p>
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
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/partners/${partner.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No institutional partners found.</p>
              <p className="text-sm mt-2">Create your first partner to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
