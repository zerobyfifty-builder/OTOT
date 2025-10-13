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
}

interface PartnerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
  onDelete: () => void;
}

export function PartnerDeleteDialog({
  open,
  onOpenChange,
  partner,
  onDelete,
}: PartnerDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Archive partner instead of deleting to preserve data integrity
      const { error } = await supabase
        .from("organizations")
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", partner.id);

      if (error) throw error;

      toast.success("Partner archived successfully");
      onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error archiving partner:", error);
      toast.error("Failed to archive partner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Partner</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive <strong>{partner.name}</strong>?
            This will deactivate the partner and remove them from active participation. 
            All historical data will be preserved. You can reactivate them later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Archiving..." : "Archive Partner"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
