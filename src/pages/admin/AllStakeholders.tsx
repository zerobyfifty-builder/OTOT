import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Landmark } from "lucide-react";
import { toast } from "sonner";

interface Stakeholder {
  id: string;
  name: string;
  legal_name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  verified: boolean;
  created_at: string;
  partner_types?: { name: string; category: string };
}

export default function AllStakeholders() {
  const navigate = useNavigate();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStakeholders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("organizations")
        .select("id, name, legal_name, category, contact_email, contact_phone, is_active, verified, created_at, partner_types(name, category)")
        .eq("category", "stakeholder")
        .eq("archived", false);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setStakeholders(data || []);
    } catch (error) {
      console.error("Error fetching stakeholders:", error);
      toast.error("Failed to fetch stakeholders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStakeholders(); }, [searchTerm]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">All Stakeholders</h1>
          <p className="text-muted-foreground mt-1">Manage plantation and project stakeholders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStakeholders} variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => navigate("/admin/stakeholders/create")} className="gap-2">
            <Plus className="h-4 w-4" />Create Stakeholder
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search stakeholders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div></div>
          ) : stakeholders.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No stakeholders found.</p>
              <Button onClick={() => navigate("/admin/stakeholders/create")} className="mt-4">Create Your First Stakeholder</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="outline">{s.partner_types?.name || 'Stakeholder'}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{s.contact_email || '-'}</div>
                        <div className="text-muted-foreground">{s.contact_phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
