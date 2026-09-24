import { useState, type FormEvent } from "react";
import { Edit, MoreVertical, Power } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { nid } from "@/lib/ids";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Vendor } from "@/types/otot";

interface VendorForm {
  name: string;
  region: string;
  mpesaPhone: string;
}

const toForm = (vendor?: Vendor): VendorForm => ({
  name: vendor?.name ?? "",
  region: vendor?.region ?? "",
  mpesaPhone: vendor?.mpesaPhone ?? "",
});

function VendorFormBody({
  vendor,
  onDone,
}: {
  vendor?: Vendor;
  onDone: () => void;
}) {
  const { upsertVendor } = useStore();
  const [initial] = useState(() => toForm(vendor));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = !vendor || JSON.stringify(form) !== JSON.stringify(initial);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setSaving(true);
    try {
      await upsertVendor({
        id: vendor?.id ?? nid(),
        status: vendor?.status ?? "active",
        name: form.name.trim(),
        region: form.region.trim() || vendor?.region || "Kenya",
        mpesaPhone: form.mpesaPhone.trim() || undefined,
      });
      toast.success(vendor ? "Partner updated successfully" : "Partner created successfully");
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div>
        <Label>Organization Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <Label>Region</Label>
        <Input
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          placeholder="Kenya"
        />
      </div>
      <div>
        <Label>M-Pesa Number</Label>
        <Input
          className="font-mono"
          value={form.mpesaPhone}
          onChange={(e) => setForm({ ...form, mpesaPhone: e.target.value })}
          placeholder="2547XXXXXXXX"
        />
        <p className="text-xs text-muted-foreground mt-1">Used for plantation payouts to this partner.</p>
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={saving || !dirty}>
          {saving ? "Saving..." : vendor ? "Save Changes" : "Create Partner"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function VendorFormSheet({
  open,
  onOpenChange,
  vendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{vendor ? "Edit Partner" : "Create New Partner"}</SheetTitle>
          <SheetDescription>
            {vendor ? "Update plantation partner details" : "Add a plantation partner organisation"}
          </SheetDescription>
        </SheetHeader>
        {open && <VendorFormBody key={vendor?.id ?? "new"} vendor={vendor} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function VendorStatusDialog({
  open,
  onOpenChange,
  vendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor;
}) {
  const { upsertVendor } = useStore();
  const [loading, setLoading] = useState(false);
  const active = vendor.status === "active";

  const toggle = async () => {
    setLoading(true);
    try {
      await upsertVendor({ ...vendor, status: active ? "inactive" : "active" });
      toast.success(`Partner ${active ? "deactivated" : "activated"} successfully`);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{active ? "Deactivate Partner" : "Activate Partner"}</AlertDialogTitle>
          <AlertDialogDescription>
            {active ? (
              <>
                Are you sure you want to deactivate <strong>{vendor.name}</strong>?
                <br />
                <br />
                They will not appear in active lists but all data will be preserved. You can reactivate them anytime.
              </>
            ) : (
              <>
                Are you sure you want to activate <strong>{vendor.name}</strong>?
                <br />
                <br />
                They will appear in active lists again.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void toggle();
            }}
            disabled={loading}
          >
            {loading ? "Processing..." : active ? "Deactivate" : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function VendorActionsMenu({ vendor }: { vendor: Vendor }) {
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${vendor.name}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            <Power className="h-4 w-4 mr-2" />
            {vendor.status === "active" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <VendorFormSheet open={editOpen} onOpenChange={setEditOpen} vendor={vendor} />
      <VendorStatusDialog open={statusOpen} onOpenChange={setStatusOpen} vendor={vendor} />
    </>
  );
}
