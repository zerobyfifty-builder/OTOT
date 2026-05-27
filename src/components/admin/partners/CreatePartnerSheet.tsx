import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CreatePartnerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const emptyForm = {
  category: '' as '' | 'institutional' | 'business',
  partnerTypeId: '',
  name: '', legalName: '', description: '',
  contactPerson: '', contactEmail: '', contactPhone: '',
  street: '', city: '', county: '', website: '', mouReference: '',
};

export function CreatePartnerSheet({ open, onOpenChange, onCreated }: CreatePartnerSheetProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: partnerTypes } = useQuery({
    queryKey: ["partnerPartnerTypes", form.category],
    enabled: !!form.category,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_types")
        .select("*")
        .eq("category", form.category)
        .eq("is_active", true);
      return data || [];
    },
  });

  const reset = () => { setStep(1); setForm(emptyForm); };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.name,
          legal_name: form.legalName,
          category: form.category,
          contact_person: form.contactPerson,
          contact_email: form.contactEmail,
          contact_phone: form.contactPhone,
          address: { street: form.street, city: form.city, county: form.county },
          website: form.website,
          partner_type_id: form.partnerTypeId || null,
          is_active: true,
          verified: false,
          metadata: { mou_reference: form.mouReference, description: form.description },
        });

      if (orgError) throw orgError;

      setShowSuccess(true);
      toast.success("Partner created successfully!");
      onCreated?.();
    } catch (error: any) {
      console.error("Error creating partner:", error);
      toast.error(error.message || "Failed to create partner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Partner</SheetTitle>
            <SheetDescription>Onboard a new partner organization.</SheetDescription>
          </SheetHeader>

          {/* Progress */}
          <div className="mt-6 mb-6">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                    s === step ? 'bg-admin-primary text-admin-cream' : s < step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>
            <div className="text-center mt-2 text-sm text-muted-foreground">
              Step {step}: {step === 1 ? 'Partner Type' : step === 2 ? 'Organization Details' : 'Review'}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Partner Category</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm({ ...form, category: v as any, partnerTypeId: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="institutional">Institutional</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Partner Type</Label>
                <Select
                  value={form.partnerTypeId}
                  onValueChange={v => setForm({ ...form, partnerTypeId: v })}
                  disabled={!form.category}
                >
                  <SelectTrigger><SelectValue placeholder={form.category ? "Select type" : "Select category first"} /></SelectTrigger>
                  <SelectContent>
                    {partnerTypes?.map(pt => (
                      <SelectItem key={pt.id} value={pt.id}>{pt.name}{pt.description ? ` — ${pt.description}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!form.category || !form.partnerTypeId}>
                  Next<ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Organization Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Legal Name</Label><Input value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} /></div>
                <div><Label>Contact Person *</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div><Label>Contact Email *</Label><Input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
                <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>County</Label><Input value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} /></div>
              </div>
              <div><Label>MoU Reference</Label><Input value={form.mouReference} onChange={e => setForm({ ...form, mouReference: e.target.value })} placeholder="e.g. MoU/KTB/PARTNER/2025" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
                <Button onClick={() => setStep(3)} disabled={!form.name || !form.contactPerson || !form.contactEmail}>
                  Next<ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <h3 className="font-semibold">Organization Summary</h3>
                <p className="text-sm"><span className="text-muted-foreground">Category:</span> {form.category}</p>
                <p className="text-sm"><span className="text-muted-foreground">Name:</span> {form.name}</p>
                <p className="text-sm"><span className="text-muted-foreground">Contact:</span> {form.contactPerson} ({form.contactEmail})</p>
                <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {form.contactPhone || 'N/A'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Website:</span> {form.website || 'N/A'}</p>
                <p className="text-sm"><span className="text-muted-foreground">MoU:</span> {form.mouReference || 'N/A'}</p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Partner'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />Partner Created
            </DialogTitle>
            <DialogDescription>The partner has been onboarded successfully.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => { setShowSuccess(false); handleClose(false); }}>Done</Button>
            <Button variant="outline" onClick={() => { setShowSuccess(false); reset(); }}>
              Create Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
