import { Fragment, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PermKey = "read" | "write" | "edit" | "delete";
const PERMS: PermKey[] = ["read", "write", "edit", "delete"];
const PERM_LABELS: Record<PermKey, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  delete: "Delete",
};

interface ModuleRow {
  id: string;
  name: string;
  display_name: string;
  sort_order: number | null;
}
interface PermRow {
  module_id: string;
  is_enabled: boolean;
  permissions: Record<PermKey, boolean>;
}
interface SubAction {
  id: string;
  module_id: string;
  key: string;
  label: string;
  sort_order: number;
}
interface SubPerm {
  sub_action_id: string;
  is_enabled: boolean;
}

const DEFAULT_PERMS: Record<PermKey, boolean> = {
  read: true,
  write: true,
  edit: true,
  delete: true,
};

export default function TouristModules() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: modules = [], isLoading: lm } = useQuery({
    queryKey: ["touristModulesCatalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name, display_name, sort_order")
        .eq("audience", "tourist")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ModuleRow[];
    },
  });

  const { data: perms = [], isLoading: lp } = useQuery({
    queryKey: ["touristModulePermissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tourist_module_permissions" as any)
        .select("module_id, is_enabled, permissions");
      if (error) throw error;
      return (data || []) as unknown as PermRow[];
    },
  });

  const { data: subs = [], isLoading: ls } = useQuery({
    queryKey: ["moduleSubActions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_sub_actions" as any)
        .select("id, module_id, key, label, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as SubAction[];
    },
  });

  const { data: subPerms = [], isLoading: lsp } = useQuery({
    queryKey: ["touristSubActionPermissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tourist_sub_action_permissions" as any)
        .select("sub_action_id, is_enabled");
      if (error) throw error;
      return (data || []) as unknown as SubPerm[];
    },
  });

  const isLoading = lm || lp || ls || lsp;

  const permFor = (moduleId: string): PermRow => {
    const found = perms.find((p) => p.module_id === moduleId);
    if (found)
      return {
        module_id: moduleId,
        is_enabled: found.is_enabled,
        permissions: { ...DEFAULT_PERMS, ...(found.permissions || {}) },
      };
    return { module_id: moduleId, is_enabled: true, permissions: DEFAULT_PERMS };
  };

  const subEnabled = (subId: string): boolean => {
    const sp = subPerms.find((s) => s.sub_action_id === subId);
    return sp ? sp.is_enabled : true;
  };

  const upsertModulePerm = async (
    moduleId: string,
    patch: { is_enabled?: boolean; permissions?: Record<PermKey, boolean> }
  ) => {
    const current = permFor(moduleId);
    const next = {
      module_id: moduleId,
      is_enabled: patch.is_enabled ?? current.is_enabled,
      permissions: patch.permissions ?? current.permissions,
    };
    const { error } = await supabase
      .from("tourist_module_permissions" as any)
      .upsert(next as any, { onConflict: "module_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["touristModulePermissions"] });
  };

  const upsertSubPerm = async (subId: string, isEnabled: boolean) => {
    const { error } = await supabase
      .from("tourist_sub_action_permissions" as any)
      .upsert({ sub_action_id: subId, is_enabled: isEnabled } as any, {
        onConflict: "sub_action_id",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["touristSubActionPermissions"] });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardContent className="pt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">Module</TableHead>
              <TableHead className="w-[120px] text-center">Enabled</TableHead>
              {PERMS.map((p) => (
                <TableHead key={p} className="w-[80px] text-center">
                  {PERM_LABELS[p]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => {
              const pr = permFor(m.id);
              const mSubs = subs.filter((s) => s.module_id === m.id);
              const isExpanded = !!expanded[m.id];
              return (
                <Fragment key={m.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {mSubs.length > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                            }
                          >
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded && "rotate-90"
                              )}
                            />
                          </Button>
                        ) : (
                          <div className="w-6" />
                        )}
                        <div>
                          <p className="font-medium">{m.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {mSubs.length} sub-action{mSubs.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pr.is_enabled}
                        onCheckedChange={(v) => upsertModulePerm(m.id, { is_enabled: v })}
                      />
                    </TableCell>
                    {PERMS.map((p) => (
                      <TableCell key={p} className="text-center">
                        <Checkbox
                          checked={pr.permissions[p]}
                          disabled={!pr.is_enabled}
                          onCheckedChange={(v) =>
                            upsertModulePerm(m.id, {
                              permissions: { ...pr.permissions, [p]: !!v },
                            })
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded &&
                    mSubs.map((s) => (
                      <TableRow key={s.id} className="bg-muted/30">
                        <TableCell className="pl-14">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {s.key}
                            </Badge>
                            <span className="text-sm">{s.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center" colSpan={5}>
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={subEnabled(s.id)}
                              disabled={!pr.is_enabled}
                              onCheckedChange={(v) => upsertSubPerm(s.id, v)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {subEnabled(s.id) ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground mt-4">
          Defaults: every module and sub-action is enabled. Toggling a row updates the experience
          for all tourist users immediately. Disabling a module hides it from the tourist portal
          and shows a "feature unavailable" placeholder on its route.
        </p>
      </CardContent>
    </Card>
  );
}
