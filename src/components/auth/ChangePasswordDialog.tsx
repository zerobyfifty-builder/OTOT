import { toast } from "sonner";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>You'll stay signed in here. Other devices will be signed out.</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          onDone={() => {
            toast.success("Password changed");
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
