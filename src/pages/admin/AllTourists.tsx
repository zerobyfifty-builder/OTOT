import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface TouristRow {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  pledge_status: boolean;
  total_donation: number | null;
  roles?: { name: string } | null;
}

export default function AllTourists() {
  const [rows, setRows] = useState<TouristRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      try {
        // Tourists are users with role 'tourist' OR no role assigned (default).
        // Exclude non-tourist roles via a left join + filter.
        const nonTouristRoles = [
          "super_admin",
          "owner",
          "business_partner",
          "government_partner",
          "travel_agent",
        ];

        let q = supabase
          .from("users")
          .select(
            `id, user_id, email, created_at, pledge_status, total_donation, roles(name)`
          )
          .order("created_at", { ascending: false })
          .limit(1000);
        if (search) q = q.ilike("email", `%${search}%`);
        const { data, error } = await q;
        if (error) throw error;
        const filtered = (data || []).filter((u: any) => {
          const roleName = u.roles?.name;
          return !roleName || !nonTouristRoles.includes(roleName);
        });
        if (!cancelled) setRows(filtered as any);
      } catch (e: any) {
        toast.error(e.message || "Failed to load tourists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(fetchRows, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="pl-8"
            />
          </div>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {rows.length} tourist{rows.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Pledge</TableHead>
                <TableHead className="text-right">Contribution</TableHead>
                <TableHead>Signed up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No tourists found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const d = new Date(r.created_at);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell>
                        {r.pledge_status ? (
                          <Badge variant="default">Pledged</Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.total_donation ? `$${Number(r.total_donation).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs leading-tight">
                        <div>{d.toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{d.toLocaleTimeString()}</div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
