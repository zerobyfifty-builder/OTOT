import { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTemplateAssignments, useCreateAssignment, useDeleteAssignment } from '@/hooks/useTemplates';
import { toast } from '@/hooks/use-toast';
import type { DocumentTemplate, TemplateCategory } from '@/lib/templates/types';

const PORTAL_OPTIONS = ['tourist', 'b2b', 'agent', 'lodge'];

export default function TemplateAssignmentsSheet({
  template, category, open, onClose,
}: { template: DocumentTemplate; category: TemplateCategory; open: boolean; onClose: () => void }) {
  const { data: assignments = [] } = useTemplateAssignments(category.key);
  const create = useCreateAssignment();
  const del = useDeleteAssignment();
  const [scope, setScope] = useState<'global' | 'partner' | 'portal'>('global');
  const [scopeRef, setScopeRef] = useState<string>('');
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (scope === 'partner') {
      supabase
        .from('organizations')
        .select('id, name')
        .eq('category', 'owner')
        .order('name')
        .then(({ data }) => setPartners((data as any) || []));
    }
  }, [scope]);

  const mine = assignments.filter((a: any) => a.template_id === template.id);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 [&>button]:hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-semibold">Assignments</div>
            <div className="text-xs text-muted-foreground">{template.name}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Add assignment</Label>
            <Select value={scope} onValueChange={(v) => { setScope(v as any); setScopeRef(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global default</SelectItem>
                <SelectItem value="partner">Plantation partner</SelectItem>
                <SelectItem value="portal">Portal</SelectItem>
              </SelectContent>
            </Select>
            {scope === 'partner' && (
              <Select value={scopeRef} onValueChange={setScopeRef}>
                <SelectTrigger><SelectValue placeholder="Pick partner" /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {scope === 'portal' && (
              <Select value={scopeRef} onValueChange={setScopeRef}>
                <SelectTrigger><SelectValue placeholder="Pick portal" /></SelectTrigger>
                <SelectContent>
                  {PORTAL_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (scope !== 'global' && !scopeRef) return toast({ title: 'Pick a target', variant: 'destructive' });
                create.mutate(
                  { category_key: category.key, template_id: template.id, scope, scope_ref_id: scope === 'global' ? null : scopeRef },
                  { onSuccess: () => { toast({ title: 'Assigned' }); setScopeRef(''); } }
                );
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Current</Label>
            {mine.length === 0 && <div className="text-xs text-muted-foreground">No assignments yet.</div>}
            {mine.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{a.scope}</Badge>
                  <span className="text-muted-foreground">{a.scope_ref_id || '—'}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
