import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PartnerCategory, PartnerFormData } from "@/types/partner";
import { Step1SelectCategory } from "@/components/admin/partner-wizard/Step1SelectCategory";
import { Step2Details } from "@/components/admin/partner-wizard/Step2Details";
import { Step3ModuleAccess } from "@/components/admin/partner-wizard/Step3ModuleAccess";
import { Step4ApiIntegration } from "@/components/admin/partner-wizard/Step4ApiIntegration";
import { Step5Review } from "@/components/admin/partner-wizard/Step5Review";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy } from "lucide-react";

const DRAFT_KEY = 'partner_onboarding_draft';

export default function CreatePartner() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PartnerFormData>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPartner, setCreatedPartner] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load draft from sessionStorage
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed.formData || {});
        setCurrentStep(parsed.step || 1);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  const saveDraft = (step: number, data: Partial<PartnerFormData>) => {
    const draft = {
      step,
      formData: { ...formData, ...data },
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    toast.success('Draft saved');
  };

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
  };

  const handleStep1Complete = (category: PartnerCategory) => {
    const data = { category };
    setFormData({ ...formData, ...data });
    saveDraft(2, data);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: any) => {
    setFormData({ ...formData, ...data });
    saveDraft(3, data);
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: any) => {
    setFormData({ ...formData, ...data });
    saveDraft(4, data);
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: any) => {
    setFormData({ ...formData, ...data });
    saveDraft(5, data);
    setCurrentStep(5);
  };

  const handleCreatePartner = async (options: {
    sendWelcomeEmail: boolean;
    activateImmediately: boolean;
    acceptedTerms: boolean;
  }) => {
    setLoading(true);
    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          legal_name: formData.legalName,
          category: formData.category,
          contact_person: formData.contactPerson,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          address: formData.address,
          website: formData.website,
          is_active: options.activateImmediately,
          verified: false,
          partner_type_id: formData.partnerTypeId,
          ...(formData.category === 'business' && {
            tax_id: formData.taxId,
            bank_account: formData.bankDetails,
            payment_terms: formData.paymentTerms,
          }),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Save module permissions
      if (formData.moduleAccess && formData.moduleAccess.length > 0) {
        const moduleInserts = formData.moduleAccess.map((module) => ({
          organization_id: orgData.id,
          module_id: module.moduleId,
          permissions: module.permissions,
          is_active: module.enabled,
        }));

        const { error: moduleError } = await supabase
          .from('organization_modules')
          .insert(moduleInserts);

        if (moduleError) throw moduleError;
      }

      // Generate API key if enabled
      let apiKey = null;
      if (formData.apiEnabled && formData.apiConfig) {
        const keyPrefix = `${formData.organizationName?.substring(0, 3).toLowerCase()}_${formData.apiConfig.environment}`;
        apiKey = `${keyPrefix}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

        const { data: userData } = await supabase.auth.getUser();
        
        const { error: apiError } = await supabase
          .from('api_keys')
          .insert({
            organization_id: orgData.id,
            created_by: userData?.user?.id || orgData.id,
            key_name: formData.apiConfig.keyName,
            key_prefix: keyPrefix,
            key_hash: apiKey, // In production, this should be hashed
            scopes: formData.apiConfig.scopes,
            rate_limit: formData.apiConfig.rateLimit,
            is_active: true,
          });

        if (apiError) throw apiError;
      }

      setCreatedPartner({
        ...orgData,
        apiKey,
      });

      clearDraft();
      setShowSuccessModal(true);
      toast.success('Partner account created successfully!');
    } catch (error: any) {
      console.error('Error creating partner:', error);
      toast.error(error.message || 'Failed to create partner account');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    if (createdPartner?.apiKey) {
      navigator.clipboard.writeText(createdPartner.apiKey);
      toast.success('API key copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-admin-cream p-8">
      {/* Progress Indicator */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === currentStep
                    ? 'bg-admin-primary text-admin-cream'
                    : step < currentStep
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 5 && (
                <div
                  className={`w-16 h-1 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-2 text-sm text-muted-foreground">
          Step {currentStep} of 5
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Step1SelectCategory
          selectedCategory={formData.category || null}
          onSelectCategory={(category) => setFormData({ ...formData, category })}
          onNext={() => formData.category && handleStep1Complete(formData.category)}
          onCancel={() => navigate('/admin/partners')}
        />
      )}

      {currentStep === 2 && formData.category && (
        <Step2Details
          category={formData.category}
          initialData={formData}
          onNext={handleStep2Complete}
          onBack={() => setCurrentStep(1)}
          onSaveDraft={(data) => saveDraft(2, data)}
        />
      )}

      {currentStep === 3 && formData.category && (
        <Step3ModuleAccess
          category={formData.category}
          initialData={formData}
          onNext={handleStep3Complete}
          onBack={() => setCurrentStep(2)}
          onSaveDraft={(data) => saveDraft(3, data)}
        />
      )}

      {currentStep === 4 && formData.category && (
        <Step4ApiIntegration
          category={formData.category}
          initialData={formData}
          onNext={handleStep4Complete}
          onBack={() => setCurrentStep(3)}
          onSaveDraft={(data) => saveDraft(4, data)}
        />
      )}

      {currentStep === 5 && (
        <Step5Review
          formData={formData as PartnerFormData}
          onBack={() => setCurrentStep(4)}
          onCreate={handleCreatePartner}
          onEdit={(step) => setCurrentStep(step)}
          loading={loading}
        />
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Partner Account Created Successfully
            </DialogTitle>
            <DialogDescription>
              The partner account has been created and configured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Partner ID:</p>
              <p className="text-sm text-muted-foreground">{createdPartner?.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Organization:</p>
              <p className="text-sm text-muted-foreground">{createdPartner?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status:</p>
              <p className="text-sm text-primary">Active</p>
            </div>
            {createdPartner?.apiKey && (
              <div>
                <p className="text-sm font-medium mb-2">API Key (show once):</p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                    {createdPartner.apiKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Save this key securely. You won't be able to see it again.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate(`/admin/partners/${createdPartner?.id}`)}>
              View Partner Profile
            </Button>
            <Button variant="outline" onClick={() => {
              setShowSuccessModal(false);
              setCurrentStep(1);
              setFormData({});
            }}>
              Create Another Partner
            </Button>
            <Button variant="ghost" onClick={() => navigate('/admin/partners')}>
              Back to Partners
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
