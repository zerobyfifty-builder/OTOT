import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { currentPortal, isRoleAllowedOnPortal, normalizeRole, portalHomePath } from "@/lib/portal";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          toast.error("Authentication failed. Please try again.");
          navigate(currentPortal.entryPath);
          return;
        }

        if (session) {
          // Use RPC function to check user role and redirect accordingly
          const { data: userRole } = await supabase
            .rpc('get_user_role', { input_user_id: session.user.id });

          const role = normalizeRole(userRole);

          // Accounts belonging to another portal cannot hold a session here.
          if (!isRoleAllowedOnPortal(role)) {
            await supabase.auth.signOut();
            toast.error('These credentials are not valid for this portal.');
            navigate(currentPortal.entryPath, { replace: true });
            return;
          }

          const roleHome = portalHomePath(role);

          // Check if there's stored pledge context
          const pledgeContextStr = sessionStorage.getItem('pledge_context');
          if (pledgeContextStr) {
            const pledgeContext = JSON.parse(pledgeContextStr);
            sessionStorage.removeItem('pledge_context');
            navigate(pledgeContext.redirectUrl || roleHome);
          } else {
            navigate(roleHome);
          }

          
          toast.success("Successfully signed in!");
        } else {
          navigate(currentPortal.entryPath);
        }
      } catch (error) {
        console.error("Unexpected error in auth callback:", error);
        toast.error("Something went wrong. Please try again.");
        navigate(currentPortal.entryPath);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
