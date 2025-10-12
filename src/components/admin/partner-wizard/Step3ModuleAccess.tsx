import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ModuleAccess, PartnerCategory } from "@/types/partner";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Step3ModuleAccessProps {
  category: PartnerCategory;
  initialData?: any;
  onNext: (data: any) => void;
  onBack: () => void;
  onSaveDraft: (data: any) => void;
}

export function Step3ModuleAccess({ category, initialData, onNext, onBack, onSaveDraft }: Step3ModuleAccessProps) {
  const [modules, setModules] = useState<ModuleAccess[]>([]);
  const [dataScope, setDataScope] = useState(initialData?.dataScope || 'own_org');
  const [anonymizePII, setAnonymizePII] = useState(initialData?.anonymizePII || true);
  const [timeRange, setTimeRange] = useState(initialData?.timeRange || 'all');
  const [exportFormats, setExportFormats] = useState<string[]>(initialData?.exportFormats || ['csv', 'pdf']);
  const [sessionTimeout, setSessionTimeout] = useState(initialData?.sessionTimeout || 30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('category, sort_order');

      if (error) throw error;

      const moduleAccess: ModuleAccess[] = (data || []).map((module) => ({
        moduleId: module.id,
        moduleName: module.display_name,
        category: module.category,
        permissions: [],
        enabled: false,
      }));

      setModules(moduleAccess);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.moduleId === moduleId ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  const togglePermission = (moduleId: string, permission: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.moduleId === moduleId) {
          const hasPermission = m.permissions.includes(permission);
          return {
            ...m,
            permissions: hasPermission
              ? m.permissions.filter((p) => p !== permission)
              : [...m.permissions, permission],
          };
        }
        return m;
      })
    );
  };

  const toggleExportFormat = (format: string) => {
    setExportFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleContinue = () => {
    const data = {
      moduleAccess: modules.filter((m) => m.enabled),
      dataAccessScope: {
        scope: dataScope,
        anonymizePII,
        timeRange: {
          type: timeRange,
        },
        exportFormats,
      },
      customRestrictions: {
        readOnly: false,
        requireIPWhitelist: false,
        require2FA: true,
        sessionTimeout,
      },
    };
    onNext(data);
  };

  const groupedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, ModuleAccess[]>);

  if (loading) {
    return <div className="flex justify-center p-8">Loading modules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-admin-primary mb-2">Configure Module Access</h2>
        <p className="text-muted-foreground">Select which modules and permissions to grant</p>
      </div>

      <Card className="p-6 max-w-5xl mx-auto">
        <div className="space-y-6">
          {/* Module Categories */}
          <div className="space-y-4">
            {Object.entries(groupedModules).map(([categoryName, categoryModules]) => (
              <Collapsible key={categoryName} defaultOpen={true}>
                <Card className="border">
                  <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold uppercase">{categoryName}</h3>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4 border-t">
                      {categoryModules.map((module) => (
                        <div key={module.moduleId} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={module.moduleId}
                              checked={module.enabled}
                              onCheckedChange={() => toggleModule(module.moduleId)}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={module.moduleId}
                                className="text-base font-medium cursor-pointer"
                              >
                                {module.moduleName}
                              </Label>
                              {module.enabled && (
                                <div className="ml-4 mt-2 space-y-2">
                                  <Label className="text-sm text-muted-foreground">Permissions:</Label>
                                  <div className="flex flex-wrap gap-3">
                                    {['view', 'create', 'update', 'delete', 'export'].map((perm) => (
                                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={module.permissions.includes(perm)}
                                          onCheckedChange={() => togglePermission(module.moduleId, perm)}
                                        />
                                        <span className="text-sm capitalize">{perm}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {/* Data Access Scope */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Data Access Scope</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={dataScope} onValueChange={setDataScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="own_org">Own Organization Only</SelectItem>
                    <SelectItem value="restricted">Restricted Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymizePII"
                  checked={anonymizePII}
                  onCheckedChange={(checked) => setAnonymizePII(checked as boolean)}
                />
                <Label htmlFor="anonymizePII">Anonymize Tourist PII (Personal Identifiable Information)</Label>
              </div>

              <div className="space-y-2">
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Historical Data</SelectItem>
                    <SelectItem value="12_months">Last 12 Months Only</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Export Permissions</Label>
                <div className="flex flex-wrap gap-3">
                  {['csv', 'pdf', 'excel', 'api'].map((format) => (
                    <label key={format} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={exportFormats.includes(format)}
                        onCheckedChange={() => toggleExportFormat(format)}
                      />
                      <span className="text-sm uppercase">{format}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 30)}
                  min={5}
                  max={480}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 mt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onSaveDraft({ modules, dataScope, anonymizePII })}>
              Save Template
            </Button>
            <Button onClick={handleContinue} className="bg-admin-primary text-admin-cream hover:bg-admin-primary/90">
              Continue →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
