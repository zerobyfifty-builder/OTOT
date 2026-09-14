import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
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
  const { session, loading } = useAuth();
  const { loading: storeLoading, error: storeError } = useStore();
  if (loading || storeLoading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/auth/login" replace />;
  if (!roles.includes(session.role)) {
    return <Navigate to={portalHomePath(session.role)} replace />;
  }
  if (storeError) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-sm text-destructive">
        {storeError}
      </div>
    );
  }
  return <>{children}</>;
}
