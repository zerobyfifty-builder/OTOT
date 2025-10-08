import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SUPABASE_URL = "https://iezhssfzbiwnofhpjahv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllemhzc2Z6Yml3bm9maHBqYWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzk4NDEsImV4cCI6MjA3NDcxNTg0MX0.lZ6mVrCKrSxza6dsbMS_2Yq5hY-trUAb-hzZGcdrcD8";

export default function MagicLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your magic link...");
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const verifyMagicLink = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid magic link. Please try again.");
        return;
      }

      try {
        // Call the edge function to verify the token
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/magic-link-verify?token=${token}`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Verification failed");
        }

        // Redirect to Supabase auth URL to complete authentication
        if (result.authUrl) {
          setStatus("success");
          setMessage("Redirecting to complete authentication...");
          setIsNewUser(result.isNewUser);
          
          // Store the redirectUrl for use after authentication completes
          if (result.redirectUrl) {
            sessionStorage.setItem('magic_link_redirect', result.redirectUrl);
          }
          
          // Redirect to Supabase's auth URL which will handle authentication
          // and redirect back to our app
          window.location.href = result.authUrl;
        } else {
          throw new Error("Failed to get authentication URL");
        }
      } catch (error: any) {
        console.error("Magic link verification error:", error);
        setStatus("error");
        setMessage(error.message || "Something went wrong. Please try again.");
        toast.error("Verification failed");
      }
    };

    verifyMagicLink();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Verifying Magic Link"}
            {status === "success" && (isNewUser ? "Account Created!" : "Welcome Back!")}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={() => navigate("/pledge")}
              >
                Go to Pledge Page
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate("/auth/login")}
              >
                Try Regular Login
              </Button>
            </div>
          )}
          {status === "success" && (
            <div className="text-center text-sm text-muted-foreground">
              Redirecting you to your dashboard...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
