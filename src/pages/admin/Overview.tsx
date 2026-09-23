import { Building2, ClipboardList, CreditCard, Landmark, ListChecks, RotateCcw, Trees, Users } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, usd } from "@/lib/format";
import { AdminStatCard } from "@/components/portal/PortalUI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOverview() {
  const { state, resetDemo } = useStore();
  const paid = state.donations.filter((d) => d.status === "paid");
  const countRole = (roles: string[]) => state.users.filter((u) => roles.includes(u.role)).length;

  return (
    <div className="min-h-full bg-admin-cream p-4 sm:p-6 md:p-8">
      <div className="max-w-[1920px] mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-admin-primary mb-2">Dashboard</h1>
            <p className="text-admin-primary/70">Complete system oversight and control</p>
          </div>
          <Button
            variant="outline"
            className="border-admin-primary/20 text-admin-primary"
            onClick={async () => {
              try {
                await resetDemo();
                toast.success("Demo data reset");
              } catch (err) {
                toast.error(apiErrorMessage(err));
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset demo data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminStatCard
            title="Total Users"
            value={state.users.length}
            icon={Users}
            description="Across all roles"
            breakdown={[
              { label: "Tourists", value: countRole(["tourist"]) },
              { label: "Ministry", value: countRole(["ministry_admin", "ministry_user"]) },
              { label: "Partners", value: countRole(["partner_admin", "partner_agent"]) },
            ]}
          />
          <AdminStatCard
            title="Vendors"
            value={state.vendors.length}
            icon={Building2}
            description="Plantation partner organisations"
            breakdown={[
              { label: "Active", value: state.vendors.filter((v) => v.status === "active").length },
              { label: "Inactive", value: state.vendors.filter((v) => v.status === "inactive").length },
            ]}
          />
          <AdminStatCard
            title="Donations"
            value={usd(paid.reduce((s, d) => s + d.amount, 0))}
            icon={CreditCard}
            description={`${paid.length} paid`}
          />
          <AdminStatCard
            title="Offset pledged"
            value={kg(paid.reduce((s, d) => s + d.carbonOffsetKg, 0))}
            icon={Trees}
            description="From paid donations"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-admin-primary">Pipeline counts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Plantation requests", value: state.plantationRequests.length, icon: ClipboardList },
              { label: "Vendor requests", value: state.vendorPlantationRequests.length, icon: ListChecks },
              { label: "Payouts", value: state.plantationPayouts.length, icon: Landmark },
            ].map((item) => (
              <Card key={item.label} className="bg-white border-admin-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-admin-primary/70">{item.label}</CardTitle>
                  <item.icon className="h-5 w-5 text-admin-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-admin-primary">{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
