import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, RefreshCw, Landmark, MoreVertical, Pencil, Power, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { CreateOwnerSheet } from "@/components/admin/owners/CreateOwnerSheet";

interface Owner {
  id: string;
  name: string;
  legal_name: string | null;
  category: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: any;
  metadata: any;
  is_active: boolean;
  verified: boolean;
  created_at: string;
  partner_types?: { name: string; category: string } | null;
}

export default function AllOwners() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Edit sheet state
  const [editOpen, setEditOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", legal_name: "", contact_person: "", contact_email: "", contact_phone: "",
    website: "", street: "", city: "", county: "", mouReference: "", description: "",
  });
  const [saving, setSaving] = useState(false);

  // Status dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Owner | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Password reset dialog state
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdOwner, setPwdOwner] = useState<Owner | null>(null);
  const [pwdUsers, setPwdUsers] = useState<{ user_id: string; email: string; first_name: string | null; last_name: string | null }[]>([]);
  const [pwdSelectedUser, setPwdSelectedUser] = useState<string>("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("organizations")
        .select("id, name, legal_name, category, contact_person, contact_email, contact_phone, website, address, metadata, is_active, verified, created_at, partner_types(name, category)")
        .eq("category", "owner")
        .eq("archived", false);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setOwners(data || []);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error("Failed to fetch owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOwners(); }, [searchTerm]);

  // --- Edit ---
  const openEdit = (s: Owner) => {
    setEditOwner(s);
    const addr = s.address || {};
    const meta = s.metadata || {};
    setEditForm({
      name: s.name || "",
      legal_name: s.legal_name || "",
      contact_person: s.contact_person || "",
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      website: s.website || "",
      street: addr.street || "",
      city: addr.city || "",
      county: addr.county || "",
      mouReference: meta.mou_reference || "",
      description: meta.description || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editOwner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: editForm.name,
          legal_name: editForm.legal_name || null,
          contact_person: editForm.contact_person || null,
          contact_email: editForm.contact_email || null,
          contact_phone: editForm.contact_phone || null,
          website: editForm.website || null,
          address: { street: editForm.street, city: editForm.city, county: editForm.county },
          metadata: { mou_reference: editForm.mouReference, description: editForm.description },
        })
        .eq("id", editOwner.id);

      if (error) throw error;
      toast.success("Owner updated successfully");
      setEditOpen(false);
      fetchOwners();
    } catch (error: any) {
      toast.error(error.message || "Failed to update owner");
    } finally {
      setSaving(false);
    }
  };

  // --- Activate / Deactivate ---
  const openStatusToggle = (s: Owner) => {
    setStatusTarget(s);
    setStatusDialogOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: !statusTarget.is_active })
        .eq("id", statusTarget.id);

      if (error) throw error;
      toast.success(`Owner ${statusTarget.is_active ? "deactivated" : "activated"} successfully`);
      setStatusDialogOpen(false);
      fetchOwners();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // --- Delete ---
  const openDelete = (s: Owner) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ archived: true, archived_at: new Date().toISOString(), is_active: false })
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("Owner deleted successfully");
      setDeleteDialogOpen(false);
      fetchOwners();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete owner");
    } finally {
      setDeleting(false);
    }
  };

  // --- Password Reset ---
  const openPasswordReset = async (s: Owner) => {
    setPwdOwner(s);
    setPwdSelectedUser("");
    setPwdNew("");
    setPwdConfirm("");
    setPwdUsers([]);
    setPwdOpen(true);
    const { data, error } = await supabase
      .from("users")
      .select("user_id, email, first_name, last_name")
      .eq("organization_id", s.id);
    if (error) {
      toast.error("Failed to load users");
      return;
    }
    setPwdUsers(data || []);
    if (data && data.length === 1) setPwdSelectedUser(data[0].user_id);
  };

  const handlePasswordReset = async () => {
    if (!pwdSelectedUser) return toast.error("Select a user");
    if (pwdNew.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwdNew !== pwdConfirm) return toast.error("Passwords do not match");
    setPwdSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-user-password", {
        body: { userId: pwdSelectedUser, newPassword: pwdNew },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Password reset successfully");
      setPwdOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-end gap-2">
        <Button onClick={fetchOwners} variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />Create Owner
        </Button>
      </div>
      <CreateOwnerSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchOwners} />

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search owners..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary" /></div>
          ) : owners.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No owners found.</p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4">Create Your First Owner</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="outline">{s.partner_types?.name || 'Owner'}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{s.contact_email || '-'}</div>
                        <div className="text-muted-foreground">{s.contact_phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPasswordReset(s)}>
                            <KeyRound className="mr-2 h-4 w-4" />Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStatusToggle(s)}>
                            <Power className="mr-2 h-4 w-4" />{s.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete(s)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Owner</SheetTitle>
            <SheetDescription>Update owner organization details</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Legal Name</Label>
              <Input value={editForm.legal_name} onChange={e => setEditForm(f => ({ ...f, legal_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={editForm.contact_person} onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.contact_email} onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.contact_phone} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input value={editForm.street} onChange={e => setEditForm(f => ({ ...f, street: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>County</Label>
                <Input value={editForm.county} onChange={e => setEditForm(f => ({ ...f, county: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>MoU Reference</Label>
              <Input value={editForm.mouReference} onChange={e => setEditForm(f => ({ ...f, mouReference: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editForm.name}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Activate/Deactivate Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.is_active ? "Deactivate" : "Activate"} Owner
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.is_active
                ? `Deactivating "${statusTarget?.name}" will prevent their users from logging in. This is temporary and can be reversed.`
                : `Activating "${statusTarget?.name}" will restore access for their users.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {statusTarget?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will archive the owner and deactivate all associated user accounts. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
