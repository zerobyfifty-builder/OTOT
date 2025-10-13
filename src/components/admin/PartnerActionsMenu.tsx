import { useState } from "react";
import { MoreVertical, Edit, Power, Trash2, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PartnerEditDialog } from "./PartnerEditDialog";
import { PartnerDeleteDialog } from "./PartnerDeleteDialog";
import { PartnerResetPasswordDialog } from "./PartnerResetPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  legal_name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  verified: boolean;
  has_api_access: boolean;
  contact_person?: string;
  website?: string;
  address?: any;
  partner_type_id?: string;
}

interface PartnerActionsMenuProps {
  partner: Partner;
  onUpdate: () => void;
}

export function PartnerActionsMenu({ partner, onUpdate }: PartnerActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const handleToggleActive = async () => {
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
    } catch (error) {
      console.error("Error toggling partner status:", error);
      toast.error("Failed to update partner status");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive}>
            <Power className="h-4 w-4 mr-2" />
            {partner.is_active ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetPasswordOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Partner
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PartnerEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        partner={partner}
        onUpdate={onUpdate}
      />
      
      <PartnerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        partner={partner}
        onDelete={onUpdate}
      />
      
      <PartnerResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        partner={partner}
      />
    </>
  );
}
