import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const NotificationsTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Bell className="h-5 w-5 text-primary" /></div>
          <div>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>Choose how you'd like to be notified</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Notification preferences are coming soon.</p>
      </CardContent>
    </Card>
  );
};
