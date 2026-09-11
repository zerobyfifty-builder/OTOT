import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { portalHomePath } from "@/lib/portal";
import type { AppRole } from "@/types/otot";
import type { ReactNode } from "react";

export function RoleRoute({
  roles,
  children,
}: {
  roles: AppRole[];
  children: ReactNode;
}) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/auth/login" replace />;
  if (!roles.includes(session.role)) {
    return <Navigate to={portalHomePath(session.role)} replace />;
  }
  return <>{children}</>;
}
