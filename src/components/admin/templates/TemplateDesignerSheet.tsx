import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { useTemplateDesign, useUpdateDesign } from '@/hooks/useTemplates';
import { renderTemplateDocument, renderSocialMessage } from '@/lib/templates/renderTemplate';
import { getSampleData } from '@/lib/templates/sampleData';
import { getDefaultDesign } from '@/lib/templates/defaultDesigns';
import type { DocumentTemplate, TemplateBlock, TemplateCategory, TemplateDesign } from '@/lib/templates/types';

interface Props {
  template: DocumentTemplate;
  category: TemplateCategory;
  open: boolean;
  onClose: () => void;
}

const BLOCK_KINDS: TemplateBlock['kind'][] = [
  'header', 'title', 'subtitle', 'awardedTo', 'recipientName', 'paragraph', 'stats', 'qrId', 'signature', 'footer', 'spacer',
];

export default function TemplateDesignerSheet({ template, category, open, onClose }: Props) {
  const { data: designRow } = useTemplateDesign(template.current_design_id);
  const update = useUpdateDesign();
  const [design, setDesign] = useState<TemplateDesign | null>(null);

  useEffect(() => {
    if (designRow?.design_json) setDesign(designRow.design_json as any);
    else setDesign(getDefaultDesign(category.key));
  }, [designRow, category.key]);

  const isSocial = category.output_kind === 'social';

  const save = () => {
    if (!design) return;
    update.mutate(
      { templateId: template.id, design, version: template.version },
      {
        onSuccess: () => {
          toast({ title: 'Saved new version' });
          onClose();
        },
      }
    );
  };

  const preview = async () => {
    if (!design) return;
    const vars = getSampleData(category.key);
    if (isSocial) {
      const { text, hashtags } = renderSocialMessage(design, vars);
      toast({ title: 'Sample message', description: `${text}\n${hashtags.map((h) => `#${h}`).join(' ')}` });
      return;
    }
    const blob = await pdf(renderTemplateDocument(design, vars)).toBlob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const moveBlock = (i: number, dir: -1 | 1) => {
    if (!design) return;
    const j = i + dir;
    if (j < 0 || j >= design.blocks.length) return;
    const blocks = [...design.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    setDesign({ ...design, blocks });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 [&>button]:hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="font-semibold">{template.name}</div>
            <div className="text-xs text-muted-foreground">{category.label} · v{template.version}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={preview}><Eye className="h-4 w-4 mr-1" /> Preview</Button>
            <Button size="sm" onClick={save} disabled={update.isPending}>Save new version</Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="text-xs">
              <span className="text-muted-foreground">Merge fields: </span>
              {category.merge_fields.map((f) => (
                <Badge key={f} variant="secondary" className="mr-1 mb-1 cursor-pointer" onClick={() => navigator.clipboard.writeText(`{{${f}}}`)}>
                  {`{{${f}}}`}
                </Badge>
              ))}
            </div>

            {design && design.layoutPreset === 'pledge_default' && (
              <PledgePresetEditor design={design} onChange={setDesign} />
            )}

            {design && !isSocial && !design.layoutPreset && (
              <>
                <StylePanel design={design} onChange={setDesign} />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Blocks</Label>
                    <AddBlock onAdd={(kind) => setDesign({ ...design, blocks: [...design.blocks, { id: crypto.randomUUID(), kind }] })} />
                  </div>
                  {design.blocks.map((b, i) => (
                    <BlockEditor
                      key={b.id}
                      block={b}
                      onChange={(nb) => {
                        const blocks = [...design.blocks];
                        blocks[i] = nb;
                        setDesign({ ...design, blocks });
                      }}
                      onDelete={() => setDesign({ ...design, blocks: design.blocks.filter((_, j) => j !== i) })}
                      onUp={() => moveBlock(i, -1)}
                      onDown={() => moveBlock(i, 1)}
                    />
                  ))}
                </div>
              </>
            )}

            {design && isSocial && (
              <div className="space-y-3">
                <div>
                  <Label>Message</Label>
                  <Textarea
                    rows={5}
                    value={design.social?.message || ''}
                    onChange={(e) => setDesign({ ...design, social: { message: e.target.value, hashtags: design.social?.hashtags || [] } })}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{(design.social?.message || '').length} chars</div>
                </div>
                <div>
                  <Label>Hashtags (comma separated, without #)</Label>
                  <Input
                    value={(design.social?.hashtags || []).join(', ')}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        social: {
                          message: design.social?.message || '',
                          hashtags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function StylePanel({ design, onChange }: { design: TemplateDesign; onChange: (d: TemplateDesign) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded">
      <div>
        <Label className="text-xs">Primary</Label>
        <Input type="color" value={design.style.primaryColor} onChange={(e) => onChange({ ...design, style: { ...design.style, primaryColor: e.target.value } })} />
      </div>
      <div>
        <Label className="text-xs">Accent</Label>
        <Input type="color" value={design.style.accentColor} onChange={(e) => onChange({ ...design, style: { ...design.style, accentColor: e.target.value } })} />
      </div>
      <div>
        <Label className="text-xs">Orientation</Label>
        <Select value={design.style.orientation} onValueChange={(v) => onChange({ ...design, style: { ...design.style, orientation: v as any } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Margin</Label>
        <Input type="number" value={design.style.margin} onChange={(e) => onChange({ ...design, style: { ...design.style, margin: Number(e.target.value) || 0 } })} />
      </div>
    </div>
  );
}

function AddBlock({ onAdd }: { onAdd: (kind: TemplateBlock['kind']) => void }) {
  const [kind, setKind] = useState<TemplateBlock['kind']>('paragraph');
  return (
    <div className="flex gap-1">
      <Select value={kind} onValueChange={(v) => setKind(v as any)}>
        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {BLOCK_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={() => onAdd(kind)}><Plus className="h-3 w-3" /></Button>
    </div>
  );
}

function BlockEditor({
  block, onChange, onDelete, onUp, onDown,
}: { block: TemplateBlock; onChange: (b: TemplateBlock) => void; onDelete: () => void; onUp: () => void; onDown: () => void }) {
  const hasText = !['header', 'qrId', 'spacer'].includes(block.kind);
  return (
    <div className="border rounded p-2 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{block.kind}</Badge>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onUp}><ArrowUp className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" onClick={onDown}><ArrowDown className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      {block.kind === 'header' && (
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Left logo (token or url)" value={block.leftLogo || ''} onChange={(e) => onChange({ ...block, leftLogo: e.target.value })} />
          <Input placeholder="Right logo (token or url)" value={block.rightLogo || ''} onChange={(e) => onChange({ ...block, rightLogo: e.target.value })} />
        </div>
      )}
      {hasText && (
        <Textarea rows={2} value={block.text || ''} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Use {{mergeField}} tokens" />
      )}
    </div>
  );
}
