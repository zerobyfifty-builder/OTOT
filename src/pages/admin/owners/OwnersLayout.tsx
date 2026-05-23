import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Layers, Activity } from "lucide-react";

const TABS = [
  { value: "/admin/owners", label: "All Owners", icon: Users },
  { value: "/admin/owners/modules", label: "Module Assignment", icon: Layers },
  { value: "/admin/owners/logs", label: "Activity Log", icon: Activity },
] as const;

export default function OwnersLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Match the most specific tab path
  const active =
    TABS.slice()
      .sort((a, b) => b.value.length - a.value.length)
      .find((t) => pathname === t.value || pathname.startsWith(t.value + "/"))?.value ??
    "/admin/owners";

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
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
