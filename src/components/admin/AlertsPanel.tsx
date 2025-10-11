import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, DollarSign, Plug, ShieldAlert, Server, ChevronRight } from "lucide-react";

interface AlertItem {
  id: string;
  type: 'reimbursement' | 'api' | 'security' | 'system';
  message: string;
  count?: number;
  severity: 'info' | 'warning' | 'error';
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const alertsList: AlertItem[] = [];

      // Check pending reimbursements
      const { data: reimbursements, error: reimbError } = await supabase
        .from('partner_transactions')
        .select('id')
        .eq('payment_status', 'pending')
        .eq('transaction_type', 'reimbursement');

      if (!reimbError && reimbursements && reimbursements.length > 0) {
        alertsList.push({
          id: 'pending-reimbursements',
          type: 'reimbursement',
          message: `${reimbursements.length} pending reimbursement${reimbursements.length > 1 ? 's' : ''} awaiting approval`,
          count: reimbursements.length,
          severity: 'warning'
        });
      }

      // Check failed API integrations (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: failedAPIs, error: apiError } = await supabase
        .from('integration_logs')
        .select('id')
        .gte('timestamp', oneHourAgo)
        .gte('status_code', 400);

      if (!apiError && failedAPIs && failedAPIs.length > 0) {
        alertsList.push({
          id: 'failed-api',
          type: 'api',
          message: `${failedAPIs.length} failed API integration${failedAPIs.length > 1 ? 's' : ''} in the last hour`,
          count: failedAPIs.length,
          severity: 'error'
        });
      }

      // Add placeholder alerts for demo
      if (alertsList.length === 0) {
        alertsList.push({
          id: 'system-healthy',
          type: 'system',
          message: 'All systems operational',
          severity: 'info'
        });
      }

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'reimbursement':
        return DollarSign;
      case 'api':
        return Plug;
      case 'security':
        return ShieldAlert;
      case 'system':
        return Server;
      default:
        return AlertCircle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-admin-primary">System Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-admin-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-admin-primary">System Alerts</CardTitle>
          <Badge variant="outline" className="text-xs">
            {alerts.filter(a => a.severity !== 'info').length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <Alert
                key={alert.id}
                className={`${getSeverityColor(alert.severity)} border`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <AlertDescription className="font-medium">
                      {alert.message}
                    </AlertDescription>
                  </div>
                  {alert.count && alert.count > 0 && (
                    <Button variant="ghost" size="sm" className="h-8">
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
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
