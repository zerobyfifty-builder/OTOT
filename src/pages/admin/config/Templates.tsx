import { useState, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Plus, Eye, Pencil, CheckCircle2, Archive, Send, Link2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTemplateCategories,
  useAllTemplates,
  useSetTemplateStatus,
  useTemplateDesign,
} from '@/hooks/useTemplates';
import { getSampleData } from '@/lib/templates/sampleData';
import { renderTemplateDocument, renderSocialMessage } from '@/lib/templates/renderTemplate';
import { renderTemplateDocumentV2, renderZoneToPlainText } from '@/lib/templates/htmlToPdf';
import { isV2Design } from '@/lib/templates/typesV2';
import TemplateDesignerSheet from '@/components/admin/templates/TemplateDesignerSheet';
import TemplateAssignmentsSheet from '@/components/admin/templates/TemplateAssignmentsSheet';
import NewTemplateSheet from '@/components/admin/templates/wysiwyg/NewTemplateSheet';
import TemplateEditor from '@/components/admin/templates/wysiwyg/TemplateEditor';
import type { DocumentTemplate, TemplateCategory } from '@/lib/templates/types';

export default function Templates() {
  const { data: categories = [] } = useTemplateCategories();
  const { data: templates = [] } = useAllTemplates();
  const setStatus = useSetTemplateStatus();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [assigning, setAssigning] = useState<DocumentTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DocumentTemplate | null>(null);

  const catByKey = useMemo(() => {
    const m: Record<string, TemplateCategory> = {};
    categories.forEach((c) => { m[c.key] = c; });
    return m;
  }, [categories]);

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('document_templates').delete().eq('id', deleting.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template deleted' });
      qc.invalidateQueries({ queryKey: ['document-templates'] });
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Templates Studio</h1>
          <p className="text-sm text-muted-foreground">
            Design, approve and assign certificates, invoices and share messages.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New template
        </Button>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No templates yet — click "New template" to get started.
                </TableCell>
              </TableRow>
            )}
            {templates.map((t) => {
              const cat = catByKey[t.category_key];
              const isLive = t.status === 'approved';
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{cat?.label || t.category_key}</TableCell>
                  <TableCell>
                    {isLive ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">v{t.version}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {cat && <PreviewButton template={t} category={cat} />}
                      {t.status === 'draft' && (
                        <Button size="sm" variant="ghost" title="Submit for approval" onClick={() => setStatus.mutate({ id: t.id, status: 'pending_approval' })}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {t.status === 'pending_approval' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Approve"
                          onClick={() => {
                            if (window.confirm('Confirm output parity with the existing generator before approving?')) {
                              setStatus.mutate({ id: t.id, status: 'approved', parity: true });
                            }
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {isLive && cat && (
                        <Button size="sm" variant="ghost" title="Assign" onClick={() => setAssigning(t)}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                      {t.status !== 'archived' && (
                        <Button size="sm" variant="ghost" title="Archive" onClick={() => setStatus.mutate({ id: t.id, status: 'archived' })}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        title={isLive ? 'Live templates cannot be deleted' : 'Delete'}
                        disabled={isLive}
                        onClick={() => !isLive && setDeleting(t)}
                      >
                        <Trash2 className={`h-4 w-4 ${isLive ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {editing && catByKey[editing.category_key] && (
        <EditTemplateRouter template={editing} category={catByKey[editing.category_key]} onClose={() => setEditing(null)} />
      )}
      {assigning && catByKey[assigning.category_key] && (
        <TemplateAssignmentsSheet
          template={assigning}
          category={catByKey[assigning.category_key]}
          open={!!assigning}
          onClose={() => setAssigning(null)}
        />
      )}
      {creating && (
        <NewTemplateSheet
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setTimeout(() => qc.invalidateQueries({ queryKey: ['document-templates'] }), 150);
          }}
        />
      )}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{deleting?.name}" and its design versions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditTemplateRouter({
  template, category, onClose,
}: { template: DocumentTemplate; category: TemplateCategory; onClose: () => void }) {
  const { data: design } = useTemplateDesign(template.current_design_id);
  if (!design) {
    return <TemplateEditor template={template} category={category} open onClose={onClose} />;
  }
  if (isV2Design(design.design_json)) {
    return <TemplateEditor template={template} category={category} open onClose={onClose} />;
  }
  return <TemplateDesignerSheet template={template} category={category} open onClose={onClose} />;
}

function PreviewButton({ template, category }: { template: DocumentTemplate; category: TemplateCategory }) {
  const { data: design } = useTemplateDesign(template.current_design_id);
  const handle = async () => {
    if (!design?.design_json) {
      toast({ title: 'No design yet', variant: 'destructive' });
      return;
    }
    const vars: Record<string, any> = { ...getSampleData(category.key) };
    try {
      const [{ imageToBase64 }, ktb, kfs] = await Promise.all([
        import('@/utils/imageToBase64'),
        import('@/assets/ktb-dual-logo.png'),
        import('@/assets/kfs-logo-2.png'),
      ]);
      vars.ktbLogoUrl = await imageToBase64(ktb.default).catch(() => '');
      vars.partnerLogoUrl = await imageToBase64(kfs.default).catch(() => '');
    } catch {}

    if (isV2Design(design.design_json)) {
      if (category.output_kind === 'social') {
        const text = renderZoneToPlainText((design.design_json as any).zones?.body, vars);
        const tags = ((design.design_json as any).hashtags || []).map((h: string) => `#${h}`).join(' ');
        toast({ title: 'Sample message', description: `${text}\n${tags}` });
        return;
      }
      const blob = await pdf(renderTemplateDocumentV2(design.design_json as any, vars)).toBlob();
      window.open(URL.createObjectURL(blob), '_blank');
      return;
    }

    if (category.output_kind === 'social') {
      const { text, hashtags } = renderSocialMessage(design.design_json as any, vars);
      toast({ title: 'Sample message', description: `${text}\n${hashtags.map((h) => `#${h}`).join(' ')}` });
      return;
    }
    const blob = await pdf(renderTemplateDocument(design.design_json as any, vars)).toBlob();
    window.open(URL.createObjectURL(blob), '_blank');
  };
  return (
    <Button size="sm" variant="ghost" title="Preview" onClick={handle}>
      <Eye className="h-4 w-4" />
    </Button>
  );
}
