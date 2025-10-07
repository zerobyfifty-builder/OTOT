import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";
import { sendMagicLink, PledgeContext } from "@/utils/magicLinkAuth";
import { toast } from "sonner";

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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      <DialogContent className="sm:max-w-md">
        {!emailSent ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Save Your Climate Action</DialogTitle>
              <DialogDescription className="text-center">
                Enter your email to save your pledge and trees. We'll send you a magic link to
                access your dashboard – no password needed!
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
                <p className="text-xs text-muted-foreground">
                  We'll only use this to send important updates about your trees
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center">Check Your Email!</DialogTitle>
              <DialogDescription className="text-center">
                We've sent a magic link to <strong>{email}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                  setPhone("");
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
