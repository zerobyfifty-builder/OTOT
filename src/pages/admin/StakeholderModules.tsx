import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2, Globe, Lock, Eye } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SidebarPreviewDialog } from "@/components/admin/SidebarPreviewDialog";
import type { StakeholderType } from "@/hooks/useOrgStakeholderType";

const PERMISSIONS = ["read", "write", "edit", "delete"] as const;
const PERMISSION_LABELS: Record<string, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  delete: "Delete",
};
const PERMISSION_SHORT: Record<string, string> = {
  read: "R",
  write: "W",
  edit: "E",
  delete: "D",
};

const MODULE_DISPLAY_OVERRIDES: Record<string, string> = {
  "Financial Management": "Climate Funding",
  "Financial": "Climate Funding",
  "Tree Management": "Pre-Tree Insights",
  "Trip Management": "Impact Journeys",
  "Outcomes": "Environmental Impact",
};

// Modules permanently removed from stakeholder allocation
const HIDDEN_MODULE_NAMES = ["planting", "monitoring", "nurseries", "payment_management"];

function getDefaultPermissions(accessType: string): string[] {
  if (accessType === "scoped") return ["read", "write", "edit", "delete"];
  return ["read"];
}

export default function StakeholderModules() {
  const queryClient = useQueryClient();
  const [previewOrgId, setPreviewOrgId] = useState<string | null>(null);

  const { data: stakeholders, isLoading: loadingOrgs } = useQuery({
    queryKey: ["stakeholderOrgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, is_active, category, partner_types(name, category)")
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

  const getOrgModule = (orgId: string, moduleId: string) => {
    return orgModules?.find(om => om.organization_id === orgId && om.module_id === moduleId && om.is_active);
  };

  const getStakeholderType = (org: any): StakeholderType => {
    const ptName = (org?.partner_types?.name || "").toLowerCase();
    const ptCat = (org?.partner_types?.category || "").toLowerCase();
    const orgCat = (org?.category || "").toLowerCase();
    const haystack = `${orgCat} ${ptCat} ${ptName} ${(org?.name || "").toLowerCase()}`;
    if (haystack.includes("plantation")) return "plantation";
    if (haystack.includes("institutional") || haystack.includes("ktb")) return "institutional";
    if (haystack.includes("technology") || haystack.includes("tech")) return "technology";
    return "other";
  };

  const getAssignedModuleNames = (orgId: string): string[] => {
    if (!orgModules || !modules) return [];
    const moduleIdToName = new Map(modules.map((m: any) => [m.id, m.name as string]));
    return orgModules
      .filter((om: any) => om.organization_id === orgId && om.is_active)
      .map((om: any) => moduleIdToName.get(om.module_id))
      .filter(Boolean) as string[];
  };

  const previewOrg = stakeholders?.find((s: any) => s.id === previewOrgId) || null;

  const toggleModule = async (orgId: string, moduleId: string, accessType: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        await supabase.from("organization_modules").delete().eq("organization_id", orgId).eq("module_id", moduleId);
      } else {
        const defaultPerms = getDefaultPermissions(accessType);
        await supabase.from("organization_modules").insert({
          organization_id: orgId,
          module_id: moduleId,
          is_active: true,
          permissions: defaultPerms,
        });
      }
      toast.success("Module access updated");
      queryClient.invalidateQueries({ queryKey: ["orgModules"] });
    } catch (error) {
      toast.error("Failed to update module access");
    }
  };

  const updatePermissions = async (orgId: string, moduleId: string, permissions: string[]) => {
    try {
      await supabase
        .from("organization_modules")
        .update({ permissions })
        .eq("organization_id", orgId)
        .eq("module_id", moduleId);
      toast.success("Permissions updated");
      queryClient.invalidateQueries({ queryKey: ["orgModules"] });
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  const togglePermission = (orgId: string, moduleId: string, currentPerms: string[], perm: string) => {
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    // Always keep "read" if any other permission is set
    if (newPerms.length > 0 && !newPerms.includes("read")) {
      newPerms.unshift("read");
    }
    updatePermissions(orgId, moduleId, newPerms);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-admin-primary">Stakeholder Modules</h1>
        <p className="text-muted-foreground mt-1">Assign modules and configure permissions for each stakeholder</p>
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
                  <TableHead className="min-w-[220px]">Module</TableHead>
                  {stakeholders.map(s => (
                    <TableHead key={s.id} className="text-center min-w-[160px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{s.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setPreviewOrgId(s.id)}
                        >
                          <Eye className="h-3 w-3" />
                          Preview sidebar
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules?.filter(m => !HIDDEN_MODULE_NAMES.includes(m.name)).map(m => {
                  const accessType = (m as any).access_type || "shared";
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{MODULE_DISPLAY_OVERRIDES[m.display_name] || m.display_name}</p>
                            <p className="text-xs text-muted-foreground">{m.category}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                            {accessType === "scoped" ? (
                              <><Lock className="h-3 w-3" /> Own data</>
                            ) : (
                              <><Globe className="h-3 w-3" /> Shared</>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      {stakeholders.map(s => {
                        const om = getOrgModule(s.id, m.id);
                        const enabled = !!om;
                        const perms = (om?.permissions as string[]) || [];

                        return (
                          <TableCell key={s.id} className="text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <Switch
                                checked={enabled}
                                onCheckedChange={() => toggleModule(s.id, m.id, accessType, enabled)}
                              />
                              {enabled && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {perms.map(p => PERMISSION_SHORT[p] || p[0].toUpperCase()).join("")}
                                  </span>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                        <Settings2 className="h-3 w-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-3" align="center">
                                      <p className="text-xs font-medium mb-2">Permissions</p>
                                      <div className="space-y-2">
                                        {PERMISSIONS.map(perm => (
                                          <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <Checkbox
                                              checked={perms.includes(perm)}
                                              onCheckedChange={() => togglePermission(s.id, m.id, perms, perm)}
                                              disabled={perm === "read" && perms.length > 1}
                                            />
                                            {PERMISSION_LABELS[perm]}
                                          </label>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SidebarPreviewDialog
        open={!!previewOrg}
        onOpenChange={(o) => !o && setPreviewOrgId(null)}
        organizationName={previewOrg?.name || ""}
        stakeholderType={previewOrg ? getStakeholderType(previewOrg) : "other"}
        assignedModuleNames={previewOrg ? getAssignedModuleNames(previewOrg.id) : []}
      />
    </div>
  );
}
