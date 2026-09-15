import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import ktbDualLogo from "@/assets/ktb-dual-logo.png";

export function TouristPage({
  title,
  subtitle,
  children,
  className,
  purchase,
  headerRight,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  purchase?: boolean;
  headerRight?: ReactNode;
}) {
  return (
    <div className={cn("tourist-dashboard-glass min-h-full", purchase && "tree-purchase-glass")}>
      <div
        className={cn(
          "tourist-dashboard-shell container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-8 sm:space-y-12",
          className,
        )}
      >
        {(title || subtitle) && (
          <div className="glass-dashboard-header mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              {title ? (
                <h1 className="tourist-page-heading text-2xl sm:text-4xl font-bold text-foreground mb-2">{title}</h1>
              ) : null}
              {subtitle ? (
                <p className="tourist-page-subheading text-sm sm:text-base text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {headerRight ?? (
              <img
                src={ktbDualLogo}
                alt="Magical Kenya and Kenya Tourism Board"
                className="hidden sm:block h-12 sm:h-20 object-contain self-start sm:self-auto"
              />
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
