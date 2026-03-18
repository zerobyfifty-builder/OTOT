import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function CreateStakeholder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [form, setForm] = useState({
    partnerTypeId: '',
    name: '',
    legalName: '',
    description: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    street: '',
    city: '',
    county: '',
    website: '',
    mouReference: '',
    // User account
    userEmail: '',
    userPassword: '',
    userName: '',
  });

  const { data: partnerTypes } = useQuery({
    queryKey: ["stakeholderPartnerTypes"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_types").select("*").eq("category", "stakeholder").eq("is_active", true);
      return data || [];
    },
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.name,
          legal_name: form.legalName,
          category: 'stakeholder',
          contact_person: form.contactPerson,
          contact_email: form.contactEmail,
          contact_phone: form.contactPhone,
          address: { street: form.street, city: form.city, county: form.county },
          website: form.website,
          partner_type_id: form.partnerTypeId || null,
          is_active: true,
          metadata: { mou_reference: form.mouReference, description: form.description },
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create stakeholder user via edge function
      if (form.userEmail && form.userPassword) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('create-stakeholder-user', {
          body: {
            name: form.userName || form.contactPerson,
            email: form.userEmail,
            password: form.userPassword,
            organization_id: org.id,
          },
        });

        if (fnError) {
          console.error('Error creating stakeholder user:', fnError);
          toast.error('Organization created but user account failed: ' + fnError.message);
        }
      }

      setCreatedId(org.id);
      setShowSuccess(true);
      toast.success("Stakeholder created successfully!");
    } catch (error: any) {
      console.error("Error creating stakeholder:", error);
      toast.error(error.message || "Failed to create stakeholder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-cream p-8">
      {/* Progress */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                s === step ? 'bg-admin-primary text-admin-cream' : s < step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-16 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center mt-2 text-sm text-muted-foreground">
          Step {step}: {step === 1 ? 'Stakeholder Type' : step === 2 ? 'Organization Details' : 'User Account & Review'}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Step 1: Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Stakeholder Type</CardTitle>
              <CardDescription>Choose the type of stakeholder you're onboarding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={form.partnerTypeId} onValueChange={v => setForm({...form, partnerTypeId: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {partnerTypes?.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name} — {pt.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/admin/stakeholders')}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!form.partnerTypeId}><ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Enter the stakeholder organization information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Organization Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Legal Name</Label><Input value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value})} /></div>
                <div><Label>Contact Person *</Label><Input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
                <div><Label>Contact Email *</Label><Input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} /></div>
                <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><Label>County</Label><Input value={form.county} onChange={e => setForm({...form, county: e.target.value})} /></div>
              </div>
              <div><Label>MoU Reference</Label><Input value={form.mouReference} onChange={e => setForm({...form, mouReference: e.target.value})} placeholder="e.g. MoU/KTB/MAU-ICLIP/2024" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
                <Button onClick={() => setStep(3)} disabled={!form.name || !form.contactPerson || !form.contactEmail}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: User Account & Review */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>User Account & Review</CardTitle>
              <CardDescription>Create a portal login for this stakeholder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <h3 className="font-semibold">Organization Summary</h3>
                <p className="text-sm"><span className="text-muted-foreground">Name:</span> {form.name}</p>
                <p className="text-sm"><span className="text-muted-foreground">Contact:</span> {form.contactPerson} ({form.contactEmail})</p>
                <p className="text-sm"><span className="text-muted-foreground">MoU:</span> {form.mouReference || 'N/A'}</p>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Portal Login Credentials</h3>
                <div><Label>Full Name</Label><Input value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} placeholder="User's full name" /></div>
                <div><Label>Email</Label><Input type="email" value={form.userEmail} onChange={e => setForm({...form, userEmail: e.target.value})} placeholder="Login email" /></div>
                <div><Label>Password</Label><Input type="password" value={form.userPassword} onChange={e => setForm({...form, userPassword: e.target.value})} placeholder="Initial password" /></div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Stakeholder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />Stakeholder Created
            </DialogTitle>
            <DialogDescription>The stakeholder has been onboarded successfully.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/admin/stakeholders')}>Back to Stakeholders</Button>
            <Button variant="outline" onClick={() => { setShowSuccess(false); setStep(1); setForm({ partnerTypeId: '', name: '', legalName: '', description: '', contactPerson: '', contactEmail: '', contactPhone: '', street: '', city: '', county: '', website: '', mouReference: '', userEmail: '', userPassword: '', userName: '' }); }}>
              Create Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
