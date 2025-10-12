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
import { Layers, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Module {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string;
  route: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export default function AccessControlModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setModules(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Failed to fetch modules");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "core":
        return "default";
      case "analytics":
        return "secondary";
      case "management":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">
            System Modules
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage platform modules and features
          </p>
        </div>
        <Button onClick={fetchModules} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Available Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No modules found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-mono text-sm">
                        {module.name}
                      </TableCell>
                      <TableCell className="font-medium">
                        {module.display_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(module.category)}>
                          {module.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {module.route || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={module.is_active ? "default" : "secondary"}>
                          {module.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{module.sort_order}</TableCell>
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
