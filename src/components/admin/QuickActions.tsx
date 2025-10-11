import { Button } from "@/components/ui/button";
import { Plus, FileText, Activity, ShieldCheck } from "lucide-react";

export function QuickActions() {
  return (
    <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-admin-accent hover:bg-admin-accent/90 text-white"
        title="Create New Partner"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="h-14 w-14 rounded-full shadow-lg"
        title="Generate Report"
      >
        <FileText className="h-5 w-5" />
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="h-14 w-14 rounded-full shadow-lg"
        title="View All Activity"
      >
        <Activity className="h-5 w-5" />
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="h-14 w-14 rounded-full shadow-lg"
        title="System Health Check"
      >
        <ShieldCheck className="h-5 w-5" />
      </Button>
    </div>
  );
}
