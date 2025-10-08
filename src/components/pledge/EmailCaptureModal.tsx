import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2 } from "lucide-react";
import { sendMagicLink, PledgeContext } from "@/utils/magicLinkAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pledgeContext?: PledgeContext;
  onEmailSubmitted?: () => void;
}

export function EmailCaptureModal({
  open,
  onOpenChange,
  pledgeContext,
  onEmailSubmitted,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    try {
      // Store pledge context if exists
      if (pledgeContext) {
        sessionStorage.setItem('pledge_context', JSON.stringify(pledgeContext));
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch (error) {
      toast.error("Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const result = await sendMagicLink(email, pledgeContext);

      if (result.success) {
        setEmailSent(true);
        toast.success("Magic link sent! Check your email to continue.");
        onEmailSubmitted?.();

        // Show dev link in development
        if (result.devLink && import.meta.env.DEV) {
          console.log("🔗 Dev Magic Link:", result.devLink);
        }
      } else {
        toast.error(result.error || "Failed to send magic link");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 shadow-xl">
        {!emailSent ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl font-semibold">
                Signup to Continue Your Climate Action
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium border-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Sign in with Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground font-medium">OR</span>
                </div>
              </div>

              {/* Email Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Enter your email to get your magic link to login
                  </p>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-12 text-base border-2 border-primary/30 focus:border-primary"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending Magic Link...
                    </>
                  ) : (
                    "Continue with Email"
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to receive emails from One Tourist One Tree
                </p>
              </form>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl font-semibold">Check Your Email!</DialogTitle>
              <DialogDescription className="text-center text-base mt-2">
                We've sent a magic link to <strong>{email}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="mb-2 font-medium">What's next?</p>
                <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                  <li>Check your email inbox</li>
                  <li>Click the magic link (valid for 24 hours)</li>
                  <li>You'll be signed in automatically!</li>
                </ol>
              </div>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                Try Different Email
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
