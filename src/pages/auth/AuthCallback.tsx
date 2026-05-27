import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
          navigate("/");
          return;
        }

        if (session) {
          // Use RPC function to check user role and redirect accordingly
          const { data: userRole } = await supabase
            .rpc('get_user_role', { input_user_id: session.user.id });

          const isSuperAdmin = userRole === 'super_admin';
          const isInstitutionalPartner = userRole === 'government_partner';
          const isBusinessPartner = userRole === 'business_partner';
          const isTravelAgent = userRole === 'travel_agent';
          const isOwner = userRole === 'owner';

          const roleHome =
            isSuperAdmin ? '/admin'
            : isInstitutionalPartner ? '/institutional/dashboard'
            : isBusinessPartner ? '/lodge/dashboard'
            : isTravelAgent ? '/agent/dashboard'
            : isOwner ? '/owner/dashboard'
            : '/dashboard';

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
          navigate("/");
        }
      } catch (error) {
        console.error("Unexpected error in auth callback:", error);
        toast.error("Something went wrong. Please try again.");
        navigate("/");
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
