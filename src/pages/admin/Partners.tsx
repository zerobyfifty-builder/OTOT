import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, Briefcase } from "lucide-react";

export default function Partners() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">Partners Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage institutional and business partner accounts
          </p>
        </div>
        <Button onClick={() => navigate("/admin/partners/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Partner
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/partners/institutional")}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-admin-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-admin-primary" />
              </div>
              <div>
                <CardTitle>Institutional Partners</CardTitle>
                <CardDescription>Tourism boards, conservation organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Active institutional partners</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/partners/business")}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-admin-accent/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-admin-accent" />
              </div>
              <div>
                <CardTitle>Business Partners</CardTitle>
                <CardDescription>Hotels, lodges, tour operators</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Active business partners</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
