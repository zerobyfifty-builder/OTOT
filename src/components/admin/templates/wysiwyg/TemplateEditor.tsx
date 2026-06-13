import { useEffect, useMemo, useState } from 'react';
import { X, Eye, Send, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { pdf } from '@react-pdf/renderer';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import ImageExt from '@tiptap/extension-image';
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
  const [resolvedLogos, setResolvedLogos] = useState<{ ktbLogoUrl?: string; partnerLogoUrl?: string; qrCodeUrl?: string }>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ imageToBase64 }, ktb, kfs] = await Promise.all([
          import('@/utils/imageToBase64'),
          import('@/assets/ktb-dual-logo.png'),
          import('@/assets/kfs-logo-2.png'),
        ]);
        const [ktbLogoUrl, partnerLogoUrl] = await Promise.all([
          imageToBase64(ktb.default).catch(() => ''),
          imageToBase64(kfs.default).catch(() => ''),
        ]);
        // Simple sample QR (inline SVG data URL)
        const qrCodeUrl =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#fff'/><g fill='#000'>${Array.from(
              { length: 8 },
            )
              .map((_, y) =>
                Array.from({ length: 8 })
                  .map((__, x) => ((x * 31 + y * 17 + 7) % 3 === 0 ? `<rect x='${x * 8}' y='${y * 8}' width='8' height='8'/>` : ''))
                  .join(''),
              )
              .join('')}</g></svg>`,
          );
        setResolvedLogos({ ktbLogoUrl, partnerLogoUrl, qrCodeUrl });
      } catch {
        // optional
      }
    })();
  }, []);

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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      ImageExt,
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
    if (editor && !editor.isDestroyed && design?.zones[activeZone]) {
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
            <Button size="sm" variant="outline" onClick={previewPdf}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmSubmit(true)} disabled={update.isPending || setStatus.isPending}>
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

        <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit for approval?</AlertDialogTitle>
              <AlertDialogDescription>
                This will save a new version of “{template.name}” and submit it for approval.
                You won’t be able to edit it again until it’s reviewed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmSubmit(false);
                  submitForApproval();
                }}
              >
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!design && <div className="p-6 text-sm text-muted-foreground">Loading design…</div>}

        {design && (
          <div className="flex-1 flex min-h-0">
            {/* Center: Editor + Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              {!isSocial && <EditorToolbar editor={editor} mergeFields={category.merge_fields} />}

              <ScrollArea className="flex-1 bg-muted/20">
                <div className="p-6 flex justify-center">
                  <div
                    className="bg-white shadow-md tpl-canvas flex flex-col"
                    style={
                      {
                        width: pxWidth * 0.72,
                        minHeight: pxWidth * 0.72 * (orientation === 'portrait' ? 1.414 : 0.707),
                        border: `3px solid ${design.style.primaryColor}`,
                        borderRadius: 4,
                        ['--tpl-primary' as any]: design.style.primaryColor,
                        ['--tpl-accent' as any]: design.style.accentColor,
                      } as React.CSSProperties
                    }
                  >
                    <style>{`
                      .tpl-canvas .ProseMirror h1 { color: #1a1a1a; font-weight: 800; text-align: center; font-size: 34px; line-height: 1.1; margin: 6px 0 14px; letter-spacing: -0.5px; }
                      .tpl-canvas .ProseMirror h2 { color: var(--tpl-accent); font-weight: 700; text-align: center; font-size: 26px; font-style: italic; margin: 6px 0 10px; }
                      .tpl-canvas .ProseMirror h3 { color: var(--tpl-accent); font-weight: 500; text-align: center; font-size: 18px; margin: 4px 0 2px; }
                      .tpl-canvas .ProseMirror p { margin: 3px 0; line-height: 1.5; font-size: 11px; color: #333; }
                      .tpl-canvas .ProseMirror { font-family: Helvetica, Arial, sans-serif; }
                    `}</style>
                    {(design.logos?.left || design.logos?.right) && (
                      <div className="flex justify-between items-center px-7 pt-5 pb-1">
                        <LogoSlot value={design.logos.left} resolved={resolvedLogos} side="left" />
                        <LogoSlot value={design.logos.right} resolved={resolvedLogos} side="right" />
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
                    <div className="flex-1">
                      <EditorContent editor={editor} />
                    </div>
                    {activeZone === 'body' && (
                      <div className="mt-auto px-7 pb-5 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-3 items-end gap-3 text-[9px] text-gray-600">
                          <div className="space-y-0.5">
                            <div>Certificate ID: {`{{certificateId}}`}</div>
                            <div>OTOT ID: {`{{ototId}}`}</div>
                          </div>
                          <div className="flex justify-center">
                            {resolvedLogos.qrCodeUrl && (
                              <img src={resolvedLogos.qrCodeUrl} alt="qr" className="h-14 w-14" />
                            )}
                          </div>
                          <div className="text-right">Date: {`{{date}}`}</div>
                        </div>
                      </div>
                    )}
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
                    <LogoEditor
                      label="Left logo"
                      value={design.logos.left}
                      resolved={resolvedLogos}
                      onChange={(v) => setDesign({ ...design, logos: { ...design.logos, left: v } })}
                    />
                    <LogoEditor
                      label="Right logo"
                      value={design.logos.right}
                      resolved={resolvedLogos}
                      onChange={(v) => setDesign({ ...design, logos: { ...design.logos, right: v } })}
                    />
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

function LogoSlot({
  value,
  resolved,
  side,
}: {
  value?: string;
  resolved?: { ktbLogoUrl?: string; partnerLogoUrl?: string };
  side?: 'left' | 'right';
}) {
  const sizeClass = side === 'left' ? 'h-14' : 'h-16';
  if (value) {
    const m = value.match(/^\{\{(\w+)\}\}$/);
    if (m) {
      const url = (resolved as any)?.[m[1]];
      if (url) return <img src={url} alt="logo" className={`${sizeClass} object-contain`} />;
      return <div className={`${sizeClass} px-2 rounded border border-dashed flex items-center text-[10px]`}>{value}</div>;
    }
    return <img src={value} alt="logo" className={`${sizeClass} object-contain`} />;
  }
  return <div className={`${sizeClass} w-24 rounded border border-dashed flex items-center justify-center text-[10px]`}>logo</div>;
}

function resolveLogoSrc(
  value: string | undefined,
  resolved?: { ktbLogoUrl?: string; partnerLogoUrl?: string },
): string | undefined {
  if (!value) return undefined;
  const m = value.match(/^\{\{(\w+)\}\}$/);
  if (m) return (resolved as any)?.[m[1]];
  return value;
}

function LogoEditor({
  label,
  value,
  resolved,
  onChange,
}: {
  label: string;
  value?: string;
  resolved?: { ktbLogoUrl?: string; partnerLogoUrl?: string };
  onChange: (v: string | undefined) => void;
}) {
  const src = resolveLogoSrc(value, resolved);
  const inputId = `logo-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
        <div className="h-14 w-20 flex items-center justify-center bg-white rounded border overflow-hidden">
          {src ? (
            <img src={src} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">No logo</span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => document.getElementById(inputId)?.click()}
          >
            {src ? 'Replace' : 'Upload'}
          </Button>
          {src && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onChange(undefined)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
