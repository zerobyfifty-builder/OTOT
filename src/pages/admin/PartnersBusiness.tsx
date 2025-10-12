import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";

export default function PartnersBusiness() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/partners")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-admin-primary">Business Partners</h1>
          <p className="text-muted-foreground mt-1">
            Hotels, lodges, tour operators, and travel agencies
          </p>
        </div>
        <Button onClick={() => navigate("/admin/partners/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Partners List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No business partners found.</p>
            <p className="text-sm mt-2">Create your first partner to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
