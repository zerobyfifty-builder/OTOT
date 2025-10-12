import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PartnerFormData } from "@/types/partner";
import { CheckCircle2, Edit } from "lucide-react";

interface Step5ReviewProps {
  formData: PartnerFormData;
  onBack: () => void;
  onCreate: (options: {
    sendWelcomeEmail: boolean;
    activateImmediately: boolean;
    acceptedTerms: boolean;
  }) => void;
  onEdit: (step: number) => void;
  loading?: boolean;
}

export function Step5Review({ formData, onBack, onCreate, onEdit, loading }: Step5ReviewProps) {
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleCreate = () => {
    if (!acceptedTerms) {
      return;
    }
    onCreate({ sendWelcomeEmail, activateImmediately, acceptedTerms });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-admin-primary mb-2">Review Partner Configuration</h2>
        <p className="text-muted-foreground">Review all details before creating the partner account</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-4">
        {/* Partner Information */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Partner Information</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium capitalize">{formData.category} Partner</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organization Name</p>
              <p className="font-medium">{formData.organizationName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Legal Name</p>
              <p className="font-medium">{formData.legalName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p className="font-medium">{formData.contactPerson} ({formData.contactEmail})</p>
            </div>
            {formData.taxId && (
              <div>
                <p className="text-muted-foreground">Tax ID</p>
                <p className="font-medium">{formData.taxId}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-primary">Active</p>
            </div>
          </div>
        </Card>

        {/* Module Access */}
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Module Access</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {formData.moduleAccess && formData.moduleAccess.length > 0 ? (
              formData.moduleAccess.slice(0, 5).map((module) => (
                <div key={module.moduleId} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{module.moduleName}: {module.permissions.join(', ')}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No modules configured</p>
            )}
            {formData.moduleAccess && formData.moduleAccess.length > 5 && (
              <p className="text-muted-foreground">
                +{formData.moduleAccess.length - 5} more modules
              </p>
            )}
          </div>
        </Card>

        {/* API Integration */}
        {formData.apiEnabled && formData.apiConfig && (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">API Integration</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium text-primary">Enabled</p>
              </div>
              <div>
                <p className="text-muted-foreground">Environment</p>
                <p className="font-medium capitalize">{formData.apiConfig.environment}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Scopes</p>
                <p className="font-medium">{formData.apiConfig.scopes.length} permissions</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate Limit</p>
                <p className="font-medium">{formData.apiConfig.rateLimit} requests/hour</p>
              </div>
              {formData.apiConfig.webhookUrl && (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Webhook</p>
                  <p className="font-medium truncate">{formData.apiConfig.webhookUrl}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Financial Settings */}
        {formData.category === 'business' && formData.bankDetails && (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">Financial Settings</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{formData.paymentTerms || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bank Account</p>
                <p className="font-medium">Configured ✓</p>
              </div>
            </div>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-4">Next Steps (After creation)</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={sendWelcomeEmail}
                onCheckedChange={(checked) => setSendWelcomeEmail(checked as boolean)}
              />
              <span className="text-sm">Send welcome email with credentials</span>
            </label>
            {formData.apiEnabled && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={true} disabled />
                <span className="text-sm">Send API documentation package</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={true} disabled />
              <span className="text-sm">Notify admin team</span>
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <Label>Activation</Label>
            <RadioGroup
              value={activateImmediately ? 'immediate' : 'draft'}
              onValueChange={(v) => setActivateImmediately(v === 'immediate')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="activate-immediate" />
                <Label htmlFor="activate-immediate" className="cursor-pointer">
                  Activate partner account immediately
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="activate-draft" />
                <Label htmlFor="activate-draft" className="cursor-pointer">
                  Create as draft (not activated)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </Card>

        {/* Terms & Conditions */}
        <Card className="p-6 border-admin-primary">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Terms & Conditions</Label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-1"
              />
              <span className="text-sm">
                Partner has reviewed and accepted OTOT Partnership Agreement. By checking this box,
                I confirm that all information provided is accurate and the partner organization
                agrees to the terms of service.
              </span>
            </label>
          </div>
        </Card>
      </div>

      <div className="flex justify-between max-w-5xl mx-auto pt-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!acceptedTerms || loading}
          className="bg-admin-primary text-admin-cream hover:bg-admin-primary/90"
        >
          {loading ? 'Creating...' : 'Create Partner Account'}
        </Button>
      </div>
    </div>
  );
}
