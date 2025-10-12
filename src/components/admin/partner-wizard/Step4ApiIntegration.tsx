import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartnerCategory } from "@/types/partner";

interface Step4ApiIntegrationProps {
  category: PartnerCategory;
  initialData?: any;
  onNext: (data: any) => void;
  onBack: () => void;
  onSaveDraft: (data: any) => void;
}

export function Step4ApiIntegration({ category, initialData, onNext, onBack, onSaveDraft }: Step4ApiIntegrationProps) {
  const [apiEnabled, setApiEnabled] = useState(initialData?.apiEnabled || false);
  const [keyName, setKeyName] = useState(initialData?.keyName || '');
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(initialData?.environment || 'production');
  const [rateLimit, setRateLimit] = useState(initialData?.rateLimit || '1000');
  const [scopes, setScopes] = useState<string[]>(initialData?.scopes || []);
  const [webhookUrl, setWebhookUrl] = useState(initialData?.webhookUrl || '');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(initialData?.webhookEvents || []);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(initialData?.ipWhitelist || []);
  const [newIp, setNewIp] = useState('');

  const availableScopes = [
    { id: 'trips:read', label: 'Read trip data', category: 'Trip Management' },
    { id: 'trips:write', label: 'Create/update trips', category: 'Trip Management' },
    { id: 'trips:delete', label: 'Delete trips', category: 'Trip Management' },
    { id: 'trees:read', label: 'Read tree data', category: 'Tree Management' },
    { id: 'trees:write', label: 'Update tree status', category: 'Tree Management' },
    { id: 'trees:delete', label: 'Delete trees', category: 'Tree Management' },
    { id: 'analytics:read', label: 'Access analytics data', category: 'Analytics' },
    { id: 'analytics:export', label: 'Export reports', category: 'Analytics' },
    { id: 'users:read', label: 'Read user data (sensitive)', category: 'User Data' },
    { id: 'users:write', label: 'Update user data', category: 'User Data' },
    { id: 'payments:read', label: 'Read payment data', category: 'Financial' },
    { id: 'payments:write', label: 'Process payments', category: 'Financial' },
  ];

  const webhookEventOptions = [
    'trip.created',
    'trip.updated',
    'payment.successful',
    'payment.failed',
    'tree.planted',
    'tree.updated',
    'certificate.generated',
    'user.created',
  ];

  const toggleScope = (scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const addIpAddress = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist((prev) => [...prev, newIp]);
      setNewIp('');
    }
  };

  const removeIpAddress = (ip: string) => {
    setIpWhitelist((prev) => prev.filter((i) => i !== ip));
  };

  const handleContinue = () => {
    const data = {
      apiEnabled,
      ...(apiEnabled && {
        apiConfig: {
          keyName,
          environment,
          scopes,
          rateLimit: parseInt(rateLimit),
          webhookUrl: webhookUrl || undefined,
          webhookEvents: webhookEvents.length > 0 ? webhookEvents : undefined,
          ipWhitelist: ipWhitelist.length > 0 ? ipWhitelist : undefined,
        },
      }),
    };
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-admin-primary mb-2">API Integration Configuration</h2>
        <p className="text-muted-foreground">
          {category === 'business' ? 'Configure API access for this partner' : 'API access typically not needed for institutional partners'}
        </p>
      </div>

      <Card className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Enable API Toggle */}
          <div className="space-y-4">
            <Label>Enable API Access for this partner?</Label>
            <RadioGroup value={apiEnabled ? 'yes' : 'no'} onValueChange={(v) => setApiEnabled(v === 'yes')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="api-no" />
                <Label htmlFor="api-no" className="cursor-pointer">No API needed (portal access only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="api-yes" />
                <Label htmlFor="api-yes" className="cursor-pointer">Yes, enable API integration</Label>
              </div>
            </RadioGroup>
          </div>

          {apiEnabled && (
            <>
              {/* API Key Configuration */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">API Key Configuration</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g., Production Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <RadioGroup value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="production" id="env-prod" />
                          <Label htmlFor="env-prod" className="cursor-pointer">Production</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sandbox" id="env-sandbox" />
                          <Label htmlFor="env-sandbox" className="cursor-pointer">Sandbox</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* API Scopes */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">API Scopes (Permissions)</h3>
                <p className="text-sm text-muted-foreground">Select allowed API operations:</p>
                <div className="space-y-3">
                  {Object.entries(
                    availableScopes.reduce((acc, scope) => {
                      if (!acc[scope.category]) acc[scope.category] = [];
                      acc[scope.category].push(scope);
                      return acc;
                    }, {} as Record<string, typeof availableScopes>)
                  ).map(([category, categoryScopes]) => (
                    <div key={category} className="space-y-2">
                      <Label className="font-semibold">{category}:</Label>
                      <div className="ml-4 space-y-2">
                        {categoryScopes.map((scope) => (
                          <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={scopes.includes(scope.id)}
                              onCheckedChange={() => toggleScope(scope.id)}
                            />
                            <span className="text-sm">{scope.id} - {scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate Limiting */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Rate Limiting</h3>
                <div className="space-y-2">
                  <Label>Tier Selection</Label>
                  <Select value={rateLimit} onValueChange={setRateLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">Basic: 100 requests/hour</SelectItem>
                      <SelectItem value="1000">Standard: 1,000 requests/hour</SelectItem>
                      <SelectItem value="10000">Premium: 10,000 requests/hour</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Webhook Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-domain.com/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Events to send:</Label>
                    <div className="grid md:grid-cols-2 gap-2">
                      {webhookEventOptions.map((event) => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={webhookEvents.includes(event)}
                            onCheckedChange={() => toggleWebhookEvent(event)}
                          />
                          <span className="text-sm">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* IP Whitelist */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">IP Whitelist (Optional)</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      placeholder="Enter IP address"
                    />
                    <Button type="button" onClick={addIpAddress}>
                      Add IP
                    </Button>
                  </div>
                  {ipWhitelist.length > 0 && (
                    <div className="space-y-2">
                      {ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{ip}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIpAddress(ip)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-6 mt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onSaveDraft({ apiEnabled, keyName, scopes })}>
              Save Draft
            </Button>
            <Button onClick={handleContinue} className="bg-admin-primary text-admin-cream hover:bg-admin-primary/90">
              {apiEnabled ? 'Continue →' : 'Skip API Setup'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
