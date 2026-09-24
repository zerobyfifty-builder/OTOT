import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface StatLine {
  label: string;
  value: number;
  total?: number;
  color: string;
}

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  stats: StatLine[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  href?: string;
  colorVariant?: "green" | "lavender" | "beige";
}

export function StatsCard({
  icon: Icon,
  title,
  subtitle,
  stats,
  buttonText,
  buttonVariant = "default",
  href,
  colorVariant = "green",
}: StatsCardProps) {
  const accentMap = {
    green: {
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
    },
    lavender: {
      iconBg: "bg-[hsl(var(--card-light-lavender))]/60",
      iconColor: "text-[hsl(235,50%,55%)]",
    },
    beige: {
      iconBg: "bg-[hsl(var(--card-light-beige))]/60",
      iconColor: "text-[hsl(30,60%,45%)]",
    },
  };

  const accent = accentMap[colorVariant];
  const primaryStat = stats[0];
  const overallProgress = primaryStat?.total
    ? Math.min((primaryStat.value / primaryStat.total) * 100, 100)
    : 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

  return (
    <Card className="glass-card h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-none">
      <CardContent className="p-5 sm:p-6 md:p-7 flex flex-col h-full gap-4 sm:gap-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${accent.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${accent.iconColor}`} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-4 sm:gap-5">
          <div className="flex-shrink-0 relative w-20 h-20 sm:w-24 sm:h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke={primaryStat?.color || "hsl(var(--primary))"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                {Math.round(overallProgress)}%
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 sm:space-y-2.5 min-w-0">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground truncate mr-2">{stat.label}</span>
                  <span className="font-semibold text-foreground whitespace-nowrap tabular-nums">
                    {stat.value}
                    {stat.total !== undefined ? `/${stat.total}` : ""}
                  </span>
                </div>
                {stat.total !== undefined && stat.total > 0 && (
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min((stat.value / stat.total) * 100, 100)}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button variant={buttonVariant} className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium" asChild={!!href}>
          {href ? <Link to={href}>{buttonText}</Link> : <span>{buttonText}</span>}
        </Button>
      </CardContent>
    </Card>
  );
}
