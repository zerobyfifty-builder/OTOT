import { Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { portalHomePath } from "@/lib/portal";
import type { AppRole } from "@/types/otot";
import type { ReactNode } from "react";

/** Staff created or reset by an admin sign in with a temporary password. */
function SetPasswordGate() {
  const { session, signOut } = useAuth();
  const { refresh } = useStore();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            {session?.email} was given a temporary password. Choose your own to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChangePasswordForm
            currentLabel="Temporary password"
            submitLabel="Set password and continue"
            onDone={() => void refresh().catch(() => undefined)}
          />
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              signOut();
              navigate("/auth/login");
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleRoute({
  roles,
  children,
}: {
  roles: AppRole[];
  children: ReactNode;
}) {
  const { session, loading } = useAuth();
  const { loading: storeLoading, error: storeError, refresh } = useStore();
  const [retrying, setRetrying] = useState(false);
  if (session?.mustChangePassword) return <SetPasswordGate />;
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
      <div className="min-h-screen grid place-items-center p-8">
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-sm text-destructive">{storeError}</p>
          <Button
            variant="outline"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              void refresh()
                .catch(() => undefined)
                .finally(() => setRetrying(false));
            }}
          >
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
