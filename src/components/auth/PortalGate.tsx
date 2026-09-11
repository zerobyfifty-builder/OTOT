import { Navigate, useLocation } from "react-router-dom";
import { detectPortal, PORTALS } from "@/lib/portal";
import type { ReactNode } from "react";

/** Ministry/vendor hosts skip the tourist landing. Localhost serves every portal. */
export function PortalGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const portal = detectPortal();

  if (portal !== "tourist" && location.pathname === "/") {
    return <Navigate to={PORTALS[portal].entryPath} replace />;
  }

  return <>{children}</>;
}
