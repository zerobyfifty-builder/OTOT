import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Users, Shield } from "lucide-react";

export const OwnerAdmin = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-1">Organization settings and sub-account management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sub-Accounts</CardTitle>
                <CardDescription>Manage team members</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create and manage sub-accounts for Nursery Managers, Field Officers, 
              and other team members with role-specific access.
            </p>
            <p className="text-xs text-muted-foreground mt-4 italic">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Module Access</CardTitle>
                <CardDescription>Configure visibility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Control which modules and pages are visible to different team members 
              within your organization.
            </p>
            <p className="text-xs text-muted-foreground mt-4 italic">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>Organization settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update organization details, contact information, and notification preferences.
            </p>
            <p className="text-xs text-muted-foreground mt-4 italic">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
