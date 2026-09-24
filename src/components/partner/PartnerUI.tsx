import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BADGE_BASE, PAGE_SIZE, TABLE_HEAD, fmtNum } from "./partnerTheme";
import { useCountUp } from "./useCountUp";

export function PartnerPageHeader({
  title,
  subtitle,
  onRefresh,
  refreshing,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {(onRefresh || actions) && (
        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function DCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "bg-card dark:bg-[#1C1F26] rounded-2xl border border-border/40 dark:border-white/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] transition-all duration-300 animate-fade-in",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {children}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  prefix,
  suffix,
  delta,
  tint,
  delay = 0,
  decimals = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  tint: { bg: string; fg: string };
  delay?: number;
  decimals?: number;
}) {
  const animated = useCountUp(value, 1200, decimals);
  const display =
    decimals > 0
      ? animated.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : fmtNum(Math.round(animated));
  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,24,40,0.08)] animate-fade-in cursor-default",
        tint.bg,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <p className={cn("text-[13px] font-medium opacity-80", tint.fg)}>{label}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className={cn("text-[28px] leading-none font-semibold tabular-nums", tint.fg)}>
          {prefix}
          {display}
          {suffix && <span className="text-[14px] font-medium opacity-70 ml-1">{suffix}</span>}
        </p>
        {delta && <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium opacity-80", tint.fg)}>{delta}</span>}
      </div>
    </div>
  );
}

export function AnimBar({ pct, color, track }: { pct: number; color: string; track: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.min(pct, 100)), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: track }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function ThinBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [w, setW] = useState(0);
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="w-28 truncate text-muted-foreground">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="tabular-nums text-foreground font-medium w-12 text-right">{fmtNum(value)}</span>
    </div>
  );
}

export function CrosshairTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-foreground text-background px-2.5 py-1.5 text-[11px] font-semibold shadow-lg tabular-nums">
      {fmtNum(payload[0].value)}
      <div className="text-[10px] font-normal opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

export function CardEmpty({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("h-[120px] flex items-center justify-center text-[12px] text-muted-foreground", className)}>
      {message}
    </div>
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
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryStatCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-2xl font-bold mt-1 tabular-nums", valueClassName)}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function StaticHead({ label, className }: { label?: ReactNode; className?: string }) {
  return <TableHead className={cn(TABLE_HEAD, className)}>{label}</TableHead>;
}

export function DateTimeCell({ value }: { value?: string | null }) {
  if (!value) return <span>-</span>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span>-</span>;
  return (
    <div className="leading-tight">
      <div className="text-sm">{format(date, "dd/MM/yyyy")}</div>
      <div className="text-[11px] text-muted-foreground">{format(date, "hh:mm a")}</div>
    </div>
  );
}

export function StatusPill({ label, className }: { label: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(BADGE_BASE, className || "bg-muted text-muted-foreground")}>
      {label}
    </Badge>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-12", className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function EmptyCard({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <Card className="py-12">
      <CardContent className="text-center">
        <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function TablePager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5 || page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
      <p className="text-xs text-muted-foreground">
        {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPage(Math.max(1, page - 1))}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink isActive={page === p} onClick={() => onPage(p)} className="cursor-pointer">
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
