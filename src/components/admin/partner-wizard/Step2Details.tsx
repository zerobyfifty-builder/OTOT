import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PartnerCategory, PartnerType } from "@/types/partner";
import { toast } from "sonner";

const detailsSchema = z.object({
  partnerTypeId: z.string().min(1, "Partner type is required"),
  organizationName: z.string().min(1, "Organization name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  description: z.string().optional(),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  county: z.string().min(1, "County is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  website: z.string().url().optional().or(z.literal("")),
  // Business specific
  businessRegNumber: z.string().optional(),
  taxId: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  branch: z.string().optional(),
  swiftCode: z.string().optional(),
  mpesaNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
}).refine((data) => {
  // Add business-specific validations if needed
  return true;
});

type DetailsFormData = z.infer<typeof detailsSchema>;

interface Step2DetailsProps {
  category: PartnerCategory;
  initialData?: Partial<DetailsFormData>;
  onNext: (data: any) => void;
  onBack: () => void;
  onSaveDraft: (data: any) => void;
}

export function Step2Details({ category, initialData, onNext, onBack, onSaveDraft }: Step2DetailsProps) {
  const [partnerTypes, setPartnerTypes] = useState<PartnerType[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: initialData || {},
  });

  useEffect(() => {
    fetchPartnerTypes();
  }, [category]);

  const fetchPartnerTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_types')
        .select('*')
        .eq('category', category)
        .eq('is_active', true);

      if (error) throw error;
      setPartnerTypes((data || []) as PartnerType[]);
    } catch (error) {
      console.error('Error fetching partner types:', error);
      toast.error('Failed to load partner types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    const formattedData = {
      partnerTypeId: data.partnerTypeId,
      organizationName: data.organizationName,
      legalName: data.legalName,
      description: data.description,
      contactPerson: data.contactPerson,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: {
        street: data.street,
        city: data.city,
        county: data.county,
        postalCode: data.postalCode,
      },
      website: data.website,
      ...(category === 'business' && {
        businessRegNumber: data.businessRegNumber,
        taxId: data.taxId,
        bankDetails: {
          bankName: data.bankName || '',
          accountName: data.accountName || '',
          accountNumber: data.accountNumber || '',
          branch: data.branch || '',
          swiftCode: data.swiftCode || '',
          mpesaNumber: data.mpesaNumber,
        },
        paymentTerms: data.paymentTerms,
      }),
    };
    onNext(formattedData);
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-admin-primary mb-2">
          {category === 'government' ? 'Government' : 'Business'} Partner Details
        </h2>
        <p className="text-muted-foreground">Fill in the partner information</p>
      </div>

      <Card className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sub-category */}
          <div className="space-y-2">
            <Label htmlFor="partnerTypeId">Sub-category *</Label>
            <Select
              value={form.watch('partnerTypeId')}
              onValueChange={(value) => form.setValue('partnerTypeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sub-category" />
              </SelectTrigger>
              <SelectContent>
                {partnerTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.partnerTypeId && (
              <p className="text-sm text-destructive">{form.formState.errors.partnerTypeId.message}</p>
            )}
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name *</Label>
            <Input {...form.register('organizationName')} />
            {form.formState.errors.organizationName && (
              <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
            )}
          </div>

          {/* Legal Name */}
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Name *</Label>
            <Input {...form.register('legalName')} />
            {form.formState.errors.legalName && (
              <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
            )}
          </div>

          {/* Business Registration Number (Business only) */}
          {category === 'business' && (
            <div className="space-y-2">
              <Label htmlFor="businessRegNumber">Business Registration Number</Label>
              <Input {...form.register('businessRegNumber')} />
            </div>
          )}

          {/* Tax ID (Business only) */}
          {category === 'business' && (
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID/PIN *</Label>
              <Input {...form.register('taxId')} />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea {...form.register('description')} rows={3} />
          </div>

          {/* Contact Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input {...form.register('contactPerson')} />
                {form.formState.errors.contactPerson && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactPerson.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input type="email" {...form.register('contactEmail')} />
                {form.formState.errors.contactEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactEmail.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input {...form.register('contactPhone')} placeholder="+254..." />
                {form.formState.errors.contactPhone && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactPhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Physical Address</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input {...form.register('street')} />
                {form.formState.errors.street && (
                  <p className="text-sm text-destructive">{form.formState.errors.street.message}</p>
                )}
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input {...form.register('city')} />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County *</Label>
                  <Input {...form.register('county')} />
                  {form.formState.errors.county && (
                    <p className="text-sm text-destructive">{form.formState.errors.county.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input {...form.register('postalCode')} />
                  {form.formState.errors.postalCode && (
                    <p className="text-sm text-destructive">{form.formState.errors.postalCode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details (Business only) */}
          {category === 'business' && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Financial Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input {...form.register('bankName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input {...form.register('accountName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input {...form.register('accountNumber')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input {...form.register('branch')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swiftCode">Swift/Routing Code</Label>
                  <Input {...form.register('swiftCode')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mpesaNumber">M-Pesa Number (Optional)</Label>
                  <Input {...form.register('mpesaNumber')} placeholder="+254..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="paymentTerms">Payment Terms *</Label>
                  <Select
                    value={form.watch('paymentTerms')}
                    onValueChange={(value) => form.setValue('paymentTerms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_15">Net 15 days</SelectItem>
                      <SelectItem value="net_30">Net 30 days</SelectItem>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input type="url" {...form.register('website')} placeholder="https://" />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              ← Back
            </Button>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSaveDraft(form.getValues())}
              >
                Save Draft
              </Button>
              <Button type="submit" className="bg-admin-primary text-admin-cream hover:bg-admin-primary/90">
                Continue →
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
