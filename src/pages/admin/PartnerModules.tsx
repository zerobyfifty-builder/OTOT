import { Fragment, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2, Globe, Lock, ChevronRight, Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PERMISSIONS = ["read", "write", "edit", "delete"] as const;
const PERMISSION_LABELS: Record<string, string> = { read: "Read", write: "Write", edit: "Edit", delete: "Delete" };
const PERMISSION_SHORT: Record<string, string> = { read: "R", write: "W", edit: "E", delete: "D" };

const MODULE_DISPLAY_OVERRIDES: Record<string, string> = {
  "Financial Management": "Climate Funding",
  "Financial": "Climate Funding",
  "Tree Management": "Per-Tree Insights",
  "Trip Management": "Travel Offsets",
  "Impact Journeys": "Travel Offsets",
  "Outcomes": "Environmental Impact",
};

const HIDDEN_MODULE_NAMES = ["planting", "monitoring", "nurseries", "payment_management", "partner_management"];
const FOREST_REGISTRY_MODULES = ["mdm_locations", "mdm_nurseries", "mdm_species", "mdm_planters", "mdm_sequestration"];
const FOREST_SUB_ORDER = ["mdm_locations", "mdm_nurseries", "mdm_species", "mdm_planters", "mdm_sequestration"];

const getModuleDisplayName = (m: any) => MODULE_DISPLAY_OVERRIDES[m.display_name] || m.display_name;

function getDefaultPermissions(accessType: string): string[] {
  if (accessType === "scoped") return ["read", "write", "edit", "delete"];
  return ["read"];
}

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PartnerModules() {
  const queryClient = useQueryClient();
  const [forestExpanded, setForestExpanded] = useState(true);

  // Sub-categories (partner_types) for government + business
  const { data: partnerTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ["partnerTypesForModules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_types")
        .select("id, name, category")
        .in("category", ["government", "business"])
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ["partnerModulesCatalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("is_active", true)
        .in("audience", ["partner", "both"])
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: typeModules, isLoading: loadingTypeModules } = useQuery({
    queryKey: ["partnerTypeModules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_type_modules").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingTypes || loadingModules || loadingTypeModules;

  const getAssignment = (partnerTypeId: string, moduleId: string) => {
    return typeModules?.find((t: any) => t.partner_type_id === partnerTypeId && t.module_id === moduleId && t.is_active);
  };

  const toggleModule = async (partnerTypeId: string, moduleId: string, accessType: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        await supabase.from("partner_type_modules").delete().eq("partner_type_id", partnerTypeId).eq("module_id", moduleId);
      } else {
        await supabase.from("partner_type_modules").insert({
          partner_type_id: partnerTypeId,
          module_id: moduleId,
          is_active: true,
          permissions: getDefaultPermissions(accessType),
        });
      }
      toast.success("Module access updated");
      queryClient.invalidateQueries({ queryKey: ["partnerTypeModules"] });
    } catch {
      toast.error("Failed to update module access");
    }
  };

  const toggleGroup = async (partnerTypeId: string, groupModules: any[], enableAll: boolean) => {
    try {
      if (enableAll) {
        const rows = groupModules
          .filter((m) => !getAssignment(partnerTypeId, m.id))
          .map((m) => ({
            partner_type_id: partnerTypeId,
            module_id: m.id,
            is_active: true,
            permissions: getDefaultPermissions((m as any).access_type || "shared"),
          }));
        if (rows.length) await supabase.from("partner_type_modules").insert(rows);
      } else {
        await supabase
          .from("partner_type_modules")
          .delete()
          .eq("partner_type_id", partnerTypeId)
          .in("module_id", groupModules.map((m) => m.id));
      }
      toast.success("Forest Registry access updated");
      queryClient.invalidateQueries({ queryKey: ["partnerTypeModules"] });
    } catch {
      toast.error("Failed to update Forest Registry access");
    }
  };

  const updatePermissions = async (partnerTypeId: string, moduleId: string, permissions: string[]) => {
    try {
      await supabase
        .from("partner_type_modules")
        .update({ permissions })
        .eq("partner_type_id", partnerTypeId)
        .eq("module_id", moduleId);
      toast.success("Permissions updated");
      queryClient.invalidateQueries({ queryKey: ["partnerTypeModules"] });
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const togglePermission = (partnerTypeId: string, moduleId: string, currentPerms: string[], perm: string) => {
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter((p) => p !== perm)
      : [...currentPerms, perm];
    if (newPerms.length > 0 && !newPerms.includes("read")) newPerms.unshift("read");
    updatePermissions(partnerTypeId, moduleId, newPerms);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Assign modules to a <span className="font-medium text-foreground">Partner Sub-Category</span>. All users whose
          organization belongs to that sub-category will see the assigned modules on login.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !partnerTypes?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No partner sub-categories found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background min-w-[220px]">Module</TableHead>
                  {partnerTypes.map((pt: any) => (
                    <TableHead key={pt.id} className="text-center min-w-[160px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant={pt.category === "government" ? "default" : "secondary"}
                          className="text-[10px] px-2 py-0"
                        >
                          {titleCase(pt.category)}
                        </Badge>
                        <span className="font-medium">{titleCase(pt.name)}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const visibleModules = (modules || []).filter((m: any) => !HIDDEN_MODULE_NAMES.includes(m.name));
                  const forestModules = visibleModules
                    .filter((m: any) => FOREST_REGISTRY_MODULES.includes(m.name))
                    .sort((a: any, b: any) => FOREST_SUB_ORDER.indexOf(a.name) - FOREST_SUB_ORDER.indexOf(b.name));
                  const otherModules = visibleModules.filter((m: any) => !FOREST_REGISTRY_MODULES.includes(m.name));

                  const renderModuleRow = (m: any, indent = false) => {
                    const accessType = (m as any).access_type || "shared";
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className={cn("flex items-center gap-2", indent && "pl-8")}>
                            <div>
                              <p className="font-medium">{getModuleDisplayName(m)}</p>
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
                        {partnerTypes.map((pt: any) => {
                          const assignment = getAssignment(pt.id, m.id);
                          const enabled = !!assignment;
                          const perms = (assignment?.permissions as string[]) || [];
                          return (
                            <TableCell key={pt.id} className="text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={() => toggleModule(pt.id, m.id, accessType, enabled)}
                                />
                                {enabled && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {perms.map((p) => PERMISSION_SHORT[p] || p[0].toUpperCase()).join("")}
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
                                          {PERMISSIONS.map((perm) => (
                                            <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                                              <Checkbox
                                                checked={perms.includes(perm)}
                                                onCheckedChange={() => togglePermission(pt.id, m.id, perms, perm)}
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
                  };

                  const renderForestRegistryRows = () => (
                    <Fragment key="forest-registry-group">
                      <TableRow className="bg-muted/40 hover:bg-muted/50">
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setForestExpanded((v) => !v)}
                            className="flex items-center gap-2 font-medium w-full text-left"
                          >
                            <ChevronRight className={cn("h-4 w-4 transition-transform", forestExpanded && "rotate-90")} />
                            <Trees className="h-4 w-4 text-primary" />
                            <span>Forest Registry</span>
                            <Badge variant="outline" className="text-[10px] ml-2">Group · {forestModules.length}</Badge>
                          </button>
                        </TableCell>
                        {partnerTypes.map((pt: any) => {
                          const enabledCount = forestModules.filter((m: any) => !!getAssignment(pt.id, m.id)).length;
                          const allOn = enabledCount === forestModules.length;
                          const someOn = enabledCount > 0 && !allOn;
                          return (
                            <TableCell key={pt.id} className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Switch
                                  checked={allOn}
                                  onCheckedChange={() => toggleGroup(pt.id, forestModules, !allOn)}
                                  className={cn(someOn && "data-[state=unchecked]:bg-primary/40")}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {enabledCount}/{forestModules.length}
                                </span>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {forestExpanded && forestModules.map((m: any) => renderModuleRow(m, true))}
                    </Fragment>
                  );

                  return (
                    <>
                      {otherModules.map((m: any) => renderModuleRow(m))}
                      {forestModules.length > 0 && renderForestRegistryRows()}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
