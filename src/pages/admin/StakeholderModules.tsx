import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function StakeholderModules() {
  const queryClient = useQueryClient();
  const { data: stakeholders, isLoading: loadingOrgs } = useQuery({
    queryKey: ["stakeholderOrgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, is_active")
        .eq("category", "stakeholder")
        .eq("archived", false);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["allModules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orgModules, isLoading: loadingOrgModules } = useQuery({
    queryKey: ["orgModules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_modules").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingOrgs || loadingModules || loadingOrgModules;

  const toggleModule = async (orgId: string, moduleId: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        await supabase.from("organization_modules").delete().eq("organization_id", orgId).eq("module_id", moduleId);
      } else {
        await supabase.from("organization_modules").insert({ organization_id: orgId, module_id: moduleId, is_active: true });
      }
      toast.success("Module access updated");
    } catch (error) {
      toast.error("Failed to update module access");
    }
  };

  const hasModule = (orgId: string, moduleId: string) => {
    return orgModules?.some(om => om.organization_id === orgId && om.module_id === moduleId && om.is_active) || false;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-admin-primary">Stakeholder Modules</h1>
        <p className="text-muted-foreground mt-1">Assign and share modules across stakeholders</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !stakeholders?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No stakeholders found. Create a stakeholder first.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Module</TableHead>
                  {stakeholders.map(s => (
                    <TableHead key={s.id} className="text-center min-w-[120px]">{s.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules?.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.display_name}</p>
                        <p className="text-xs text-muted-foreground">{m.category}</p>
                      </div>
                    </TableCell>
                    {stakeholders.map(s => (
                      <TableCell key={s.id} className="text-center">
                        <Switch
                          checked={hasModule(s.id, m.id)}
                          onCheckedChange={() => toggleModule(s.id, m.id, hasModule(s.id, m.id))}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
