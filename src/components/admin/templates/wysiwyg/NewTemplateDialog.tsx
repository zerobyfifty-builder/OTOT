import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useTemplateCategories, useCreateTemplate } from '@/hooks/useTemplates';
import { startersForCategory } from '@/lib/templates/starters';
import type { CategoryKey, TemplateCategory } from '@/lib/templates/types';
import type { TemplateStarter } from '@/lib/templates/typesV2';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (templateId: string) => void;
  /** When provided, dialog opens directly on the starter step for that category. */
  initialCategory?: CategoryKey | null;
}

export default function NewTemplateDialog({ open, onClose, onCreated, initialCategory }: Props) {
  const { data: categories = [] } = useTemplateCategories();
  const create = useCreateTemplate();
  const [step, setStep] = useState<'category' | 'starter' | 'name'>(initialCategory ? 'starter' : 'category');
  const [category, setCategory] = useState<TemplateCategory | null>(
    initialCategory ? categories.find((c) => c.key === initialCategory) || null : null,
  );
  const [starter, setStarter] = useState<TemplateStarter | null>(null);
  const [name, setName] = useState('');

  const reset = () => {
    setStep(initialCategory ? 'starter' : 'category');
    setCategory(initialCategory ? categories.find((c) => c.key === initialCategory) || null : null);
    setStarter(null);
    setName('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleCreate = () => {
    if (!category || !starter) return;
    const finalName = name.trim() || `${category.label} – ${starter.label}`;
    create.mutate(
      { category_key: category.key, name: finalName, design: starter.design as any },
      {
        onSuccess: (tpl: any) => {
          toast({ title: 'Template created', description: 'Opening editor…' });
          close();
          onCreated?.(tpl?.id);
        },
        onError: (e: any) => toast({ title: 'Create failed', description: e.message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl p-0 [&>button]:hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-2">
            {step !== (initialCategory ? 'starter' : 'category') && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setStep(step === 'name' ? 'starter' : 'category')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <div className="font-semibold">New template</div>
              <div className="text-xs text-muted-foreground">
                {step === 'category' && 'Step 1 · Choose document type'}
                {step === 'starter' && `Step 2 · Choose a starter${category ? ` for ${category.label}` : ''}`}
                {step === 'name' && 'Step 3 · Name your template'}
              </div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-5">
            {step === 'category' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      setStep('starter');
                    }}
                    className="text-left rounded-lg border p-4 hover:border-primary hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{c.label}</div>
                      <Badge variant="secondary" className="capitalize">{c.output_kind}</Badge>
                    </div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 'starter' && category && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {startersForCategory(category.key).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setStarter(s);
                      setName(`${category.label} – ${s.label}`);
                      setStep('name');
                    }}
                    className="text-left rounded-lg border overflow-hidden hover:border-primary transition"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
                      <StarterThumb starter={s} />
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-sm">{s.label}</div>
                      {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
                    </div>
                  </button>
                ))}
                {startersForCategory(category.key).length === 0 && (
                  <div className="col-span-full text-sm text-muted-foreground py-8 text-center">
                    No starters yet for this category.
                  </div>
                )}
              </div>
            )}

            {step === 'name' && category && starter && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="text-sm font-medium">Template name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Type: </span>{category.label}</div>
                  <div><span className="text-muted-foreground">Starter: </span>{starter.label}</div>
                  <div><span className="text-muted-foreground">Orientation: </span>{starter.design.style.orientation}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep('starter')}>Back</Button>
                  <Button onClick={handleCreate} disabled={create.isPending}>
                    {create.isPending ? 'Creating…' : 'Create & edit'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StarterThumb({ starter }: { starter: TemplateStarter }) {
  const d = starter.design;
  return (
    <div
      className="bg-white rounded shadow-sm border w-full h-full p-3 flex flex-col"
      style={{ borderColor: d.style.primaryColor }}
    >
      <div className="flex justify-between text-[7px] text-muted-foreground mb-1">
        <span>LOGO</span><span>LOGO</span>
      </div>
      <div className="text-[10px] font-bold text-center leading-tight" style={{ color: d.style.primaryColor }}>
        {firstHeading(d.zones.body) || starter.label}
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="h-0.5 bg-muted-foreground/30 rounded w-3/4 mx-auto" />
        <div className="h-0.5 bg-muted-foreground/30 rounded w-2/3 mx-auto" />
        <div className="h-0.5 bg-muted-foreground/30 rounded w-1/2 mx-auto" />
      </div>
      <div className="mt-auto text-[7px] text-center text-muted-foreground">{d.style.orientation}</div>
    </div>
  );
}

function firstHeading(zone: any): string | undefined {
  const blocks = zone?.content || [];
  for (const b of blocks) {
    if (b.type === 'heading' && b.content) {
      return b.content
        .map((c: any) => (c.type === 'text' ? c.text : c.type === 'mergeField' ? `{{${c.attrs?.name}}}` : ''))
        .join('');
    }
  }
  return undefined;
}
