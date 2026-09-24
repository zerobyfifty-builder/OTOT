import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, DollarSign, Landmark, Server, TreePine } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AlertItem {
  id: string;
  type: "payment" | "plantation" | "payout" | "system";
  message: string;
  count?: number;
  severity: "info" | "warning" | "error";
  href?: string;
}

const ICONS = {
  payment: DollarSign,
  plantation: TreePine,
  payout: Landmark,
  system: Server,
} as const;

const SEVERITY = {
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
} as const;

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-admin-primary">System Alerts</CardTitle>
          <Badge variant="outline" className="text-xs">
            {alerts.filter((a) => a.severity !== "info").length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = ICONS[alert.type] ?? AlertCircle;
            return (
              <Alert key={alert.id} className={`${SEVERITY[alert.severity]} border`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <AlertDescription className="font-medium">{alert.message}</AlertDescription>
                  </div>
                  {alert.href && alert.count && alert.count > 0 && (
                    <Button variant="ghost" size="sm" className="h-8" asChild>
                      <Link to={alert.href}>
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
