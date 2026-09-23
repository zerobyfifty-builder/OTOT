import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type PortalTone = "ministry" | "partner" | "admin";

const PAGE_CLASS: Record<PortalTone, string> = {
  ministry: "p-4 sm:p-6 md:p-8 space-y-6",
  partner: "p-4 sm:p-6 md:p-8 space-y-6",
  admin: "min-h-full bg-admin-cream p-4 sm:p-6 md:p-8 space-y-6",
};

const TITLE_CLASS: Record<PortalTone, string> = {
  ministry: "text-2xl sm:text-3xl font-bold text-foreground",
  partner: "text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2",
  admin: "text-2xl sm:text-3xl font-bold tracking-tight text-admin-primary",
};

const SUBTITLE_CLASS: Record<PortalTone, string> = {
  ministry: "text-muted-foreground mt-1",
  partner: "text-muted-foreground text-sm mt-1",
  admin: "text-sm text-muted-foreground mt-1",
};

export function PortalPage({
  tone,
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
}: {
  tone: PortalTone;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={PAGE_CLASS[tone]}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={TITLE_CLASS[tone]}>
            {Icon && <Icon className="h-6 w-6 text-primary" />}
            {title}
          </h1>
          {subtitle && <p className={SUBTITLE_CLASS[tone]}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function TableFrame({ children }: { children: ReactNode }) {
  return <div className="rounded-md border overflow-x-auto">{children}</div>;
}

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

type Breakdown = { label: string; value: ReactNode; highlight?: boolean }[];

export function AccentStatCard({
  label,
  value,
  icon: Icon,
  accent,
  breakdown,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent: { border: string; icon: string };
  breakdown?: Breakdown;
}) {
  return (
    <Card className={cn("relative overflow-hidden border-l-4", accent.border)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className={cn("h-4 w-4", accent.icon)} />
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {breakdown && breakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1 text-xs">
              {breakdown.map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("font-medium", row.highlight && "text-primary")}>{row.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function IconStatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tint: { bg: string; fg: string };
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", tint.bg)}>
            <Icon className={cn("h-5 w-5", tint.fg)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiTile({
  label,
  value,
  suffix,
  tint,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  tint: { bg: string; fg: string };
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,24,40,0.08)] animate-fade-in cursor-default",
        tint.bg,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <p className={cn("text-[13px] font-medium opacity-80", tint.fg)}>{label}</p>
      <p className={cn("mt-3 text-[28px] leading-none font-semibold tabular-nums", tint.fg)}>
        {value}
        {suffix && <span className="text-[14px] font-medium opacity-70 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

export function SoftCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] transition-all duration-300 animate-fade-in",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  description,
  breakdown,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  description?: string;
  breakdown?: Breakdown;
}) {
  return (
    <Card className="bg-white border-admin-primary/10 hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-admin-primary/70">{title}</CardTitle>
        <Icon className="h-5 w-5 text-admin-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-admin-primary">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-3 space-y-1">
            {breakdown.map((row) => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{row.label}:</span>
                <span className="font-medium text-admin-primary">{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
