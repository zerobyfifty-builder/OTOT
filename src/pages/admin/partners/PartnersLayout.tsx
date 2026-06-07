import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Layers, Activity, Plus, RefreshCw } from "lucide-react";

const TABS = [
  {
    value: "/admin/partners",
    label: "All Partners",
    icon: Users,
    title: "Partners",
    subtitle: "Create and manage partner organizations, modules and access.",
  },
  {
    value: "/admin/partners/modules",
    label: "Module Assignment",
    icon: Layers,
    title: "Module Assignment",
    subtitle: "Assign modules and configure permissions for each partner.",
  },
  {
    value: "/admin/partners/logs",
    label: "Activity Log",
    icon: Activity,
    title: "Activity Log",
    subtitle: "Review actions performed by users within each partner organization.",
  },
] as const;

export default function PartnersLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const active =
    TABS.slice()
      .sort((a, b) => b.value.length - a.value.length)
      .find((t) => pathname === t.value || pathname.startsWith(t.value + "/"))?.value ??
    "/admin/partners";

  const activeTab = TABS.find((t) => t.value === active) ?? TABS[0];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{activeTab.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeTab.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.location.reload()} variant="outline" size="icon" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate("/admin/partners/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Partner
          </Button>
        </div>
      </div>
      <Tabs value={active} onValueChange={(v) => navigate(v)} className="w-full">
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
