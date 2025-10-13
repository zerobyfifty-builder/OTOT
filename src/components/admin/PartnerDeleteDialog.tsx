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
      // Permanently archive partner - this hides them from all lists
      const { error } = await supabase
        .from("organizations")
        .update({ 
          archived: true,
          archived_at: new Date().toISOString(),
          is_active: false, // Also deactivate when archiving
          updated_at: new Date().toISOString()
        })
        .eq("id", partner.id);

      if (error) throw error;

      toast.success("Partner archived permanently");
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
          <AlertDialogTitle>Archive Partner Permanently</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently archive <strong>{partner.name}</strong>?
            <br /><br />
            This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove them from all partner lists</li>
              <li>Deactivate their account</li>
              <li>Preserve all historical data</li>
            </ul>
            <br />
            <strong>Note:</strong> Use "Deactivate" instead if you need temporary suspension.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Archiving..." : "Archive Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
