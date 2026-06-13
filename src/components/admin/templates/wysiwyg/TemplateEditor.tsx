import { useEffect, useMemo, useState } from 'react';
import { X, Eye, Send } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import ImageExt from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useTemplateDesign, useUpdateDesign, useSetTemplateStatus } from '@/hooks/useTemplates';
import { MergeField } from './MergeFieldExtension';
import EditorToolbar from './EditorToolbar';
import { renderTemplateDocumentV2 } from '@/lib/templates/htmlToPdf';
import { getSampleData } from '@/lib/templates/sampleData';
import { isV2Design, type TemplateDesignV2, type TipTapJSON } from '@/lib/templates/typesV2';
import { findStarter } from '@/lib/templates/starters';
import type { DocumentTemplate, TemplateCategory } from '@/lib/templates/types';

interface Props {
  template: DocumentTemplate;
  category: TemplateCategory;
  open: boolean;
  onClose: () => void;
}

const PAGE_WIDTH_PX: Record<string, { portrait: number; landscape: number }> = {
  A4: { portrait: 595, landscape: 842 },
  LETTER: { portrait: 612, landscape: 792 },
};

export default function TemplateEditor({ template, category, open, onClose }: Props) {
  const { data: designRow } = useTemplateDesign(template.current_design_id);
  const update = useUpdateDesign();
  const setStatus = useSetTemplateStatus();

  const [design, setDesign] = useState<TemplateDesignV2 | null>(null);
  const [activeZone, setActiveZone] = useState<string>('body');

  useEffect(() => {
    if (designRow?.design_json) {
      const d = designRow.design_json as any;
      if (isV2Design(d)) {
        setDesign(d);
        return;
      }
      // Fallback: shouldn't happen because router only opens V2 here.
      const fallback = findStarter(`${category.key}.standard`) || findStarter(`${category.key}.classic`);
      if (fallback) setDesign(fallback.design);
    }
  }, [designRow, category.key]);

  const isSocial = category.output_kind === 'social';
  const zoneKeys = useMemo(() => (design ? Object.keys(design.zones) : []), [design]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      ImageExt,
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Type here…' }),
      MergeField,
    ],
    content: design?.zones[activeZone] || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      if (!design) return;
      const json = editor.getJSON() as TipTapJSON;
      setDesign({ ...design, zones: { ...design.zones, [activeZone]: json } });
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] focus:outline-none px-6 py-4',
      },
    },
  }, [activeZone, design?.starterKey]);

  useEffect(() => {
    if (editor && design?.zones[activeZone]) {
      const current = JSON.stringify(editor.getJSON());
      const next = JSON.stringify(design.zones[activeZone]);
      if (current !== next) {
        editor.commands.setContent(design.zones[activeZone] as any, { emitUpdate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZone, editor]);

  const save = () => {
    if (!design) return;
    update.mutate(
      { templateId: template.id, design: design as any, version: template.version },
      {
        onSuccess: () => {
          toast({ title: 'Saved new version' });
          onClose();
        },
        onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
      },
    );
  };

  const submitForApproval = () => {
    if (!design) return;
    update.mutate(
      { templateId: template.id, design: design as any, version: template.version },
      {
        onSuccess: () => {
          setStatus.mutate(
            { id: template.id, status: 'pending_approval' },
            {
              onSuccess: () => {
                toast({ title: 'Submitted for approval' });
                onClose();
              },
            },
          );
        },
      },
    );
  };

  const previewPdf = async () => {
    if (!design) return;
    const vars: Record<string, any> = { ...getSampleData(category.key) };
    try {
      const [{ imageToBase64 }, ktb, kfs] = await Promise.all([
        import('@/utils/imageToBase64'),
        import('@/assets/ktb-dual-logo.png'),
        import('@/assets/kfs-logo-2.png'),
      ]);
      vars.ktbLogoUrl = await imageToBase64(ktb.default).catch(() => '');
      vars.partnerLogoUrl = await imageToBase64(kfs.default).catch(() => '');
    } catch {
      // optional
    }
    if (isSocial) {
      const { renderZoneToPlainText } = await import('@/lib/templates/htmlToPdf');
      const text = renderZoneToPlainText(design.zones.body, vars);
      const tags = (design.hashtags || []).map((h) => `#${h}`).join(' ');
      toast({ title: 'Sample message', description: `${text}\n${tags}` });
      return;
    }
    const blob = await pdf(renderTemplateDocumentV2(design, vars)).toBlob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const orientation = design?.style.orientation || 'portrait';
  const pageSize = design?.style.pageSize || 'A4';
  const pxWidth = PAGE_WIDTH_PX[pageSize][orientation];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0 [&>button]:hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="min-w-0">
            <div className="font-semibold truncate">{template.name}</div>
            <div className="text-xs text-muted-foreground">{category.label} · v{template.version}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={previewPdf}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button size="sm" variant="outline" onClick={submitForApproval} disabled={update.isPending || setStatus.isPending}>
              <Send className="h-4 w-4 mr-1" /> Submit
            </Button>
            <Button size="sm" onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save new version'}
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!design && <div className="p-6 text-sm text-muted-foreground">Loading design…</div>}

        {design && (
          <div className="flex-1 flex min-h-0">
            {/* Center: Editor + Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              {!isSocial && <EditorToolbar editor={editor} mergeFields={category.merge_fields} />}

              <ScrollArea className="flex-1 bg-muted/20">
                <div className="p-6 flex justify-center">
                  <div
                    className="bg-white shadow-md"
                    style={{
                      width: pxWidth * 0.72,
                      minHeight: pxWidth * 0.72 * (orientation === 'portrait' ? 1.414 : 0.707),
                      border: `2px solid ${design.style.primaryColor}`,
                      borderRadius: 4,
                    }}
                  >
                    {(design.logos?.left || design.logos?.right) && (
                      <div className="flex justify-between items-center p-3 border-b text-xs text-muted-foreground">
                        <LogoSlot value={design.logos.left} />
                        <LogoSlot value={design.logos.right} />
                      </div>
                    )}
                    {zoneKeys.length > 1 && (
                      <Tabs value={activeZone} onValueChange={setActiveZone} className="border-b">
                        <TabsList className="rounded-none bg-transparent justify-start px-3">
                          {zoneKeys.map((z) => (
                            <TabsTrigger key={z} value={z} className="capitalize">{z}</TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    )}
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Right: Inspector */}
            <div className="w-80 border-l flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Logos</Label>
                    <div>
                      <Label className="text-xs">Left logo</Label>
                      <Input
                        value={design.logos.left || ''}
                        placeholder="{{ktbLogoUrl}} or image URL"
                        onChange={(e) => setDesign({ ...design, logos: { ...design.logos, left: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Right logo</Label>
                      <Input
                        value={design.logos.right || ''}
                        placeholder="{{partnerLogoUrl}} or image URL"
                        onChange={(e) => setDesign({ ...design, logos: { ...design.logos, right: e.target.value } })}
                      />
                    </div>
                  </div>

                  {!isSocial && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Page</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Size</Label>
                          <Select
                            value={design.style.pageSize}
                            onValueChange={(v) => setDesign({ ...design, style: { ...design.style, pageSize: v as any } })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A4">A4</SelectItem>
                              <SelectItem value="LETTER">Letter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Orientation</Label>
                          <Select
                            value={design.style.orientation}
                            onValueChange={(v) => setDesign({ ...design, style: { ...design.style, orientation: v as any } })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">Portrait</SelectItem>
                              <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Margin (pt)</Label>
                        <Input
                          type="number"
                          value={design.style.margin}
                          onChange={(e) => setDesign({ ...design, style: { ...design.style, margin: Number(e.target.value) || 0 } })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Colors</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Primary</Label>
                        <Input
                          type="color"
                          value={design.style.primaryColor}
                          onChange={(e) => setDesign({ ...design, style: { ...design.style, primaryColor: e.target.value } })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Accent</Label>
                        <Input
                          type="color"
                          value={design.style.accentColor}
                          onChange={(e) => setDesign({ ...design, style: { ...design.style, accentColor: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>

                  {isSocial && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Hashtags</Label>
                      <Input
                        placeholder="comma separated, without #"
                        value={(design.hashtags || []).join(', ')}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            hashtags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Merge fields</Label>
                    <div className="flex flex-wrap gap-1">
                      {category.merge_fields.map((f) => (
                        <Badge key={f} variant="secondary" className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`{{${f}}}`)}>
                          {`{{${f}}}`}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Click a chip to copy, or use the “Merge field” button in the toolbar to insert.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LogoSlot({ value }: { value?: string }) {
  if (!value) return <div className="h-10 w-24 rounded border border-dashed flex items-center justify-center">logo</div>;
  if (value.startsWith('{{')) {
    return <div className="h-10 px-2 rounded border border-dashed flex items-center text-[10px]">{value}</div>;
  }
  return <img src={value} alt="logo" className="h-10 object-contain" />;
}
