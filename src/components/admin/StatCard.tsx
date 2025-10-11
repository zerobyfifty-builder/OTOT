import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  breakdown?: Array<{
    label: string;
    value: string | number;
  }>;
}

export function StatCard({ title, value, icon: Icon, description, trend, breakdown }: StatCardProps) {
  return (
    <Card className="bg-white border-admin-primary/10 hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-admin-primary/70">{title}</CardTitle>
        <Icon className="h-5 w-5 text-admin-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-admin-primary">{value}</div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        
        {trend && (
          <div className="flex items-center mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">this month</span>
          </div>
        )}

        {breakdown && breakdown.length > 0 && (
          <div className="mt-3 space-y-1">
            {breakdown.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}:</span>
                <span className="font-medium text-admin-primary">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
