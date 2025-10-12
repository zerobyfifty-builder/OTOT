import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  role_category: string;
  created_at: string;
}

export default function AccessControlRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("role_category", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;

      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "system":
        return "destructive";
      case "partner":
        return "default";
      case "user":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system roles and access levels
          </p>
        </div>
        <Button onClick={fetchRoles} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No roles found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-mono text-sm">
                        {role.name}
                      </TableCell>
                      <TableCell className="font-medium">
                        {role.display_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(role.role_category)}>
                          {role.role_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(role.created_at).toLocaleDateString()}
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
