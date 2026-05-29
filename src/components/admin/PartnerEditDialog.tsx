import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const KENYAN_MINISTRIES = [
  "Agriculture and Livestock Development",
  "Co-operatives and Micro, Small and Medium Enterprises (MSMEs) Development",
  "Defence",
  "Education",
  "Energy and Petroleum",
  "Environment, Climate Change and Forestry",
  "Foreign and Diaspora Affairs",
  "Health",
  "Information, Communications and the Digital Economy",
  "Interior and National Administration",
  "Investments, Trade and Industry",
  "Labour and Social Protection",
  "Lands, Public Works, Housing and Urban Development",
  "Mining, Blue Economy and Maritime Affairs",
  "National Treasury and Economic Planning",
  "Roads and Transport",
  "Tourism and Wildlife",
  "Water, Sanitation and Irrigation",
  "Youth Affairs, Creative Economy and Sports",
];

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

interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
  onUpdate: () => void;
}

export function PartnerEditDialog({ open, onOpenChange, partner, onUpdate }: PartnerEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [ministryOpen, setMinistryOpen] = useState(false);
  const [initial, setInitial] = useState<any>(null);
  const [form, setForm] = useState<any>(null);

  // Load full org including metadata
  useEffect(() => {
    if (!open || !partner?.id) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", partner.id)
        .maybeSingle();
      const addr = (data?.address as any) || {};
      const meta = (data?.metadata as any) || {};
      const next = {
        name: data?.name || "",
        legal_name: data?.legal_name || "",
        category: data?.category || partner.category || "",
        partner_type_id: data?.partner_type_id || "",
        ministry: meta.ministry || "",
        contact_person: data?.contact_person || "",
        contact_email: data?.contact_email || "",
        contact_phone: data?.contact_phone || "",
        website: data?.website || "",
        street: addr.street || "",
        city: addr.city || "",
        county: addr.county || "",
        mou_reference: meta.mou_reference || "",
        description: meta.description || "",
        verified: !!data?.verified,
        has_api_access: !!data?.has_api_access,
        is_active: data?.is_active !== false,
      };
      setForm(next);
      setInitial(next);
    })();
  }, [open, partner?.id]);

  const { data: partnerTypes } = useQuery({
    queryKey: ["editPartnerTypes", form?.category],
    enabled: !!form?.category,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_types").select("*")
        .eq("category", form.category).eq("is_active", true);
      return data || [];
    },
  });

  const isDirty = useMemo(() => {
    if (!form || !initial) return false;
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || !form) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: form.name,
          legal_name: form.legal_name,
          category: form.category,
          partner_type_id: form.partner_type_id || null,
          contact_person: form.contact_person,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          website: form.website,
          address: { street: form.street, city: form.city, county: form.county },
          metadata: {
            mou_reference: form.mou_reference,
            description: form.description,
            ...(form.category === "government" && form.ministry ? { ministry: form.ministry } : {}),
          },
          verified: form.verified,
          has_api_access: form.has_api_access,
          is_active: form.is_active,
        })
        .eq("id", partner.id);

      if (error) throw error;
      toast.success("Partner updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating partner:", err);
      toast.error(err.message || "Failed to update partner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Partner</SheetTitle>
          <SheetDescription>Update partner organization details</SheetDescription>
        </SheetHeader>

        {!form ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Partner Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, partner_type_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-category</Label>
                <Select value={form.partner_type_id} onValueChange={v => setForm({ ...form, partner_type_id: v })} disabled={!form.category}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {partnerTypes?.map(pt => (
                      <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.category === "government" && (
              <div>
                <Label>Ministry</Label>
                <Popover open={ministryOpen} onOpenChange={setMinistryOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !form.ministry && "text-muted-foreground")}>
                      {form.ministry || "Select ministry"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search ministry..." />
                      <CommandList>
                        <CommandEmpty>No ministry found.</CommandEmpty>
                        <CommandGroup>
                          {KENYAN_MINISTRIES.map(m => (
                            <CommandItem key={m} value={m} onSelect={() => { setForm({ ...form, ministry: m }); setMinistryOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", form.ministry === m ? "opacity-100" : "opacity-0")} />
                              {m}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Organization Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Legal Name</Label><Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><Label>Contact Email *</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} required /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
              <div><Label>Street</Label><Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>County</Label><Input value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} /></div>
            </div>

            <div><Label>MoU Reference</Label><Input value={form.mou_reference} onChange={e => setForm({ ...form, mou_reference: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5"><Label>Verified</Label><p className="text-sm text-muted-foreground">Mark as verified</p></div>
              <Switch checked={form.verified} onCheckedChange={c => setForm({ ...form, verified: c })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5"><Label>API Access</Label><p className="text-sm text-muted-foreground">Enable API access</p></div>
              <Switch checked={form.has_api_access} onCheckedChange={c => setForm({ ...form, has_api_access: c })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5"><Label>Active</Label><p className="text-sm text-muted-foreground">Partner is active</p></div>
              <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading || !isDirty}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
