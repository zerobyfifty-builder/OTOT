import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Plus, Eye, Pencil, CheckCircle2, Archive, Send, Link2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  useTemplateCategories,
  useTemplatesByCategory,
  useEngineFlags,
  useToggleEngineFlag,
  useCreateTemplate,
  useSetTemplateStatus,
} from '@/hooks/useTemplates';
import { getDefaultDesign } from '@/lib/templates/defaultDesigns';
import { getSampleData } from '@/lib/templates/sampleData';
import { renderTemplateDocument, renderSocialMessage } from '@/lib/templates/renderTemplate';
import { useTemplateDesign } from '@/hooks/useTemplates';
import TemplateDesignerSheet from '@/components/admin/templates/TemplateDesignerSheet';
import TemplateAssignmentsSheet from '@/components/admin/templates/TemplateAssignmentsSheet';
import type { CategoryKey, DocumentTemplate, TemplateCategory } from '@/lib/templates/types';

export default function Templates() {
  const { data: categories } = useTemplateCategories();
  const { data: flags } = useEngineFlags();
  const toggleFlag = useToggleEngineFlag();
  const [activeCat, setActiveCat] = useState<CategoryKey | null>(null);

  const cat = activeCat ?? (categories?.[0]?.key as CategoryKey | undefined) ?? null;
  const flag = flags?.find((f: any) => f.category_key === cat);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Templates Studio</h1>
        <p className="text-sm text-muted-foreground">
          Design, approve and assign certificates, invoices and share messages. Each category has a kill switch — when OFF the existing generator is used (default).
        </p>
      </div>

      <Tabs value={cat ?? ''} onValueChange={(v) => setActiveCat(v as CategoryKey)}>
        <TabsList className="flex flex-wrap h-auto">
          {(categories || []).map((c) => (
            <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
          ))}
        </TabsList>
        {(categories || []).map((c) => (
          <TabsContent key={c.key} value={c.key} className="mt-4">
            <CategoryPanel
              category={c}
              flagEnabled={flag?.category_key === c.key ? !!flag.is_enabled : false}
              onToggleFlag={(v) => toggleFlag.mutate({ category_key: c.key, is_enabled: v })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CategoryPanel({
  category,
  flagEnabled,
  onToggleFlag,
}: {
  category: TemplateCategory;
  flagEnabled: boolean;
  onToggleFlag: (v: boolean) => void;
}) {
  const { data: templates = [] } = useTemplatesByCategory(category.key);
  const create = useCreateTemplate();
  const setStatus = useSetTemplateStatus();
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [assigning, setAssigning] = useState<DocumentTemplate | null>(null);

  const handleCreate = () => {
    create.mutate(
      { category_key: category.key, name: `${category.label} draft`, design: getDefaultDesign(category.key) },
      { onSuccess: () => toast({ title: 'Template created' }) }
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-semibold">{category.label}</div>
          <div className="text-xs text-muted-foreground">{category.description}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={flagEnabled ? 'text-emerald-600' : 'text-muted-foreground'}>
              Engine {flagEnabled ? 'ON' : 'OFF (fallback)'}
            </span>
            <Switch checked={flagEnabled} onCheckedChange={onToggleFlag} />
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                No templates yet — the existing built-in generator will be used.
              </TableCell>
            </TableRow>
          )}
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                <Badge variant={t.status === 'approved' ? 'default' : 'secondary'}>{t.status}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">v{t.version}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(t.updated_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <PreviewButton template={t} category={category} />
                  {t.status === 'draft' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: t.id, status: 'pending_approval' })}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  {t.status === 'pending_approval' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm('Confirm output parity with the existing generator before approving?')) {
                          setStatus.mutate({ id: t.id, status: 'approved', parity: true });
                        }
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  {t.status === 'approved' && (
                    <Button size="sm" variant="ghost" onClick={() => setAssigning(t)}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                  )}
                  {t.status !== 'archived' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: t.id, status: 'archived' })}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && (
        <TemplateDesignerSheet
          template={editing}
          category={category}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
      {assigning && (
        <TemplateAssignmentsSheet
          template={assigning}
          category={category}
          open={!!assigning}
          onClose={() => setAssigning(null)}
        />
      )}
    </Card>
  );
}

function PreviewButton({ template, category }: { template: DocumentTemplate; category: TemplateCategory }) {
  const { data: design } = useTemplateDesign(template.current_design_id);
  const handle = async () => {
    if (!design?.design_json) {
      toast({ title: 'No design yet', variant: 'destructive' });
      return;
    }
    const vars = getSampleData(category.key);
    if (category.output_kind === 'social') {
      const { text, hashtags } = renderSocialMessage(design.design_json as any, vars);
      toast({ title: 'Sample message', description: `${text}\n${hashtags.map((h) => `#${h}`).join(' ')}` });
      return;
    }
    const blob = await pdf(renderTemplateDocument(design.design_json as any, vars)).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
  return (
    <Button size="sm" variant="ghost" onClick={handle}>
      <Eye className="h-4 w-4" />
    </Button>
  );
}
