import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  is_active: boolean;
}

interface PartnerStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
  onUpdate: () => void;
}

export function PartnerStatusDialog({
  open,
  onOpenChange,
  partner,
  onUpdate,
}: PartnerStatusDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: !partner.is_active })
        .eq("id", partner.id);

      if (error) throw error;

      toast.success(
        `Partner ${partner.is_active ? "deactivated" : "activated"} successfully`
      );
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error toggling partner status:", error);
      toast.error("Failed to update partner status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {partner.is_active ? "Deactivate Partner" : "Activate Partner"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {partner.is_active ? (
              <>
                Are you sure you want to deactivate <strong>{partner.name}</strong>?
                <br /><br />
                This will temporarily suspend their account. They will not appear in active lists
                but all data will be preserved. You can reactivate them anytime.
              </>
            ) : (
              <>
                Are you sure you want to activate <strong>{partner.name}</strong>?
                <br /><br />
                This will restore their account and they will appear in active lists again.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggleStatus}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : partner.is_active
              ? "Deactivate"
              : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
