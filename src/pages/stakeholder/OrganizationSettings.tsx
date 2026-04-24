import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralTab } from "@/components/stakeholder/settings/GeneralTab";
import { OrganizationTab } from "@/components/stakeholder/settings/OrganizationTab";
import { UsersTab } from "@/components/stakeholder/settings/UsersTab";
import { NotificationsTab } from "@/components/stakeholder/settings/NotificationsTab";
import { PlantingCostsTab } from "@/components/settings/PlantingCostsTab";
import { PlantingCostsKTBTab } from "@/components/settings/PlantingCostsKTBTab";
import { LogsTab } from "@/components/stakeholder/settings/LogsTab";
import { useOrgStakeholderType } from "@/hooks/useOrgStakeholderType";
import { useIsOrgAdmin } from "@/hooks/useIsOrgAdmin";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Users, Building2, DollarSign, Bell, ScrollText } from "lucide-react";

export const OrganizationSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "general";
  const { data: orgCtx } = useOrgStakeholderType();
  const { data: isOrgAdmin } = useIsOrgAdmin();

  const isInstitutional = orgCtx?.stakeholderType === "institutional";

  const setTab = (t: string) => setSearchParams({ tab: t }, { replace: true });

  const orgInitials = (orgCtx?.organizationName || "OR")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account, team and organization settings</p>
        </div>
        {orgCtx?.organizationName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{orgInitials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{orgCtx.organizationName}</span>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
            <User className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="organization" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
            <Building2 className="h-4 w-4" /> Organization
          </TabsTrigger>
          {isOrgAdmin && (
            <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
          )}
          <TabsTrigger value="planting-costs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
            <DollarSign className="h-4 w-4" /> Planting Costs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          {isOrgAdmin && (
            <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5">
              <ScrollText className="h-4 w-4" /> Activity logs
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-6"><GeneralTab /></TabsContent>
        {isOrgAdmin && <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>}
        <TabsContent value="organization" className="mt-6"><OrganizationTab /></TabsContent>
        <TabsContent value="planting-costs" className="mt-6">
          {isInstitutional ? <PlantingCostsKTBTab /> : <PlantingCostsTab />}
        </TabsContent>
        <TabsContent value="notifications" className="mt-6"><NotificationsTab /></TabsContent>
        {isOrgAdmin && (
          <TabsContent value="logs" className="mt-6">
            <LogsTab organizationId={orgCtx?.organizationId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default OrganizationSettings;
