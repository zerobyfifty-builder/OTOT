import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Landmark, Trees, Cpu, Layers } from "lucide-react";

type OwnerType = "technology" | "government" | "plantation" | "other";

function classifyOwner(org: any): OwnerType {
  const ptName = (org?.partner_types?.name || "").toLowerCase();
  const ptCat = (org?.partner_types?.category || "").toLowerCase();
  const orgCat = (org?.category || "").toLowerCase();
  const haystack = `${orgCat} ${ptCat} ${ptName} ${(org?.name || "").toLowerCase()}`;
  if (haystack.includes("plantation")) return "plantation";
  if (haystack.includes("government") || haystack.includes("ktb")) return "government";
  if (haystack.includes("technology") || haystack.includes("tech")) return "technology";
  return "other";
}

const TYPE_META: Record<OwnerType, { label: string; icon: any; description: string }> = {
  technology: {
    label: "Technology",
    icon: Cpu,
    description: "Tech partner owner dashboards — platform, API, and integrations focus.",
  },
  government: {
    label: "Government",
    icon: Landmark,
    description: "Institutional owner dashboards — KTB and partner program overview.",
  },
  plantation: {
    label: "Plantation",
    icon: Trees,
    description: "Plantation owner dashboards — nursery, planting, and monitoring metrics.",
  },
  other: {
    label: "Other",
    icon: Building2,
    description: "Owners not yet classified by partner type.",
  },
};

function OwnerTypePanel({ type, owners, loading }: { type: OwnerType; owners: any[]; loading: boolean }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const list = owners.filter((o) => classifyOwner(o) === type);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{meta.label} Owners</h3>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <Badge variant="outline" className="ml-auto tabular-nums">
          {loading ? "…" : list.length} owner{list.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No {meta.label.toLowerCase()} owners configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {o.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={o.is_active ? "default" : "secondary"}>
                    {o.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Partner Type</span>
                  <span className="font-medium">{o.partner_types?.name || "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnersDashboard() {
  const { data: owners, isLoading } = useQuery({
    queryKey: ["adminOwnersDashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, is_active, category, partner_types(name, category)")
        .eq("category", "owner")
        .eq("archived", false);
      if (error) throw error;
      return data || [];
    },
  });

  const counts = useMemo(() => {
    const c: Record<OwnerType, number> = { technology: 0, government: 0, plantation: 0, other: 0 };
    (owners || []).forEach((o) => {
      c[classifyOwner(o)]++;
    });
    return c;
  }, [owners]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-admin-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-admin-primary">Owners Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Account-specific dashboards grouped by owner type.
          </p>
        </div>
      </div>

      <Tabs defaultValue="technology" className="w-full">
        <TabsList>
          <TabsTrigger value="technology">
            Tech <Badge variant="secondary" className="ml-2 tabular-nums">{counts.technology}</Badge>
          </TabsTrigger>
          <TabsTrigger value="government">
            Government <Badge variant="secondary" className="ml-2 tabular-nums">{counts.government}</Badge>
          </TabsTrigger>
          <TabsTrigger value="plantation">
            Plantation <Badge variant="secondary" className="ml-2 tabular-nums">{counts.plantation}</Badge>
          </TabsTrigger>
          <TabsTrigger value="other">
            Other <Badge variant="secondary" className="ml-2 tabular-nums">{counts.other}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="technology" className="mt-6">
          <OwnerTypePanel type="technology" owners={owners || []} loading={isLoading} />
        </TabsContent>
        <TabsContent value="government" className="mt-6">
          <OwnerTypePanel type="government" owners={owners || []} loading={isLoading} />
        </TabsContent>
        <TabsContent value="plantation" className="mt-6">
          <OwnerTypePanel type="plantation" owners={owners || []} loading={isLoading} />
        </TabsContent>
        <TabsContent value="other" className="mt-6">
          <OwnerTypePanel type="other" owners={owners || []} loading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
