import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Linkedin,
  Share2,
  Twitter,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface PdfPreviewFile {
  blob: Blob;
  name: string;
}

interface PdfPreviewDialogProps {
  file: PdfPreviewFile | null;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Show share menu (certificates). Hidden for receipts by default. */
  showShare?: boolean;
  /** Custom download handler. Falls back to blob download. */
  onDownload?: (file: PdfPreviewFile) => void;
}

/* ------------------------------------------------------------------ */
/*  Share helper                                                       */
/* ------------------------------------------------------------------ */

const shareUrl =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  window.location.origin;

const buildShareMessage = (name: string) =>
  `I just earned my ${name} from One Tourist One Tree! 🌍🌳 Join me in sustainable travel. #OneTouristOneTree #SustainableTravel #Kenya`;

const ShareMenu = ({ certName }: { certName: string }) => {
  const [copied, setCopied] = useState(false);
  const message = buildShareMessage(certName);

  const open = (url: string) => window.open(url, '_blank', 'width=600,height=400');

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`${message}\n${shareUrl}`);
      setCopied(true);
      toast.success('Message & link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="grid w-56 gap-1 p-1">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Share your certificate</p>
      <button onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"><Facebook className="h-4 w-4" /> Facebook</button>
      <button onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"><Twitter className="h-4 w-4" /> Twitter / X</button>
      <button onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"><Linkedin className="h-4 w-4" /> LinkedIn</button>
      <div className="my-1 h-px bg-border" />
      <button onClick={copyMessage} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors">
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Copy message & link'}
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Default download helper                                            */
/* ------------------------------------------------------------------ */

const defaultDownload = (file: PdfPreviewFile) => {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ------------------------------------------------------------------ */
/*  Main dialog                                                        */
/* ------------------------------------------------------------------ */

export const PdfPreviewDialog = ({
  file,
  onClose,
  title,
  description,
  showShare = false,
  onDownload,
}: PdfPreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file.blob);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const openInNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!file) return;
    (onDownload ?? defaultDownload)(file);
  };

  const displayName = file?.name?.replace('.pdf', '') || 'Document';

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate">{title || file?.name || 'PDF Preview'}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex h-[72vh] flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-muted/30">
            {previewUrl ? (
              <object data={previewUrl} type="application/pdf" className="h-full w-full">
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="max-w-sm text-sm text-muted-foreground">PDF preview is not available in this browser.</p>
                  <Button variant="outline" onClick={openInNewTab}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                </div>
              </object>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Preparing preview…</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {showShare ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <ShareMenu certName={displayName} />
                </PopoverContent>
              </Popover>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={openInNewTab} disabled={!previewUrl}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
              {file && (
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
