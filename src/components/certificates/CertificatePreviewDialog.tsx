import { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface CertificatePreviewFile {
  blob: Blob;
  name: string;
}

interface CertificatePreviewDialogProps {
  previewCert: CertificatePreviewFile | null;
  onClose: () => void;
  onDownload: (certificate: CertificatePreviewFile) => void;
}

export const CertificatePreviewDialog = ({
  previewCert,
  onClose,
  onDownload,
}: CertificatePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewCert) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(previewCert.blob);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewCert]);

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={!!previewCert} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {previewCert?.name || 'Certificate Preview'}
          </DialogTitle>
          <DialogDescription>
            Preview your certificate below, open it in a new tab, or download it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[72vh] flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-muted/30">
            {previewUrl ? (
              <object data={previewUrl} type="application/pdf" className="h-full w-full">
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="max-w-sm text-sm text-muted-foreground">
                    PDF preview is not available in this browser.
                  </p>
                  <Button variant="outline" onClick={openInNewTab}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              </object>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing preview…
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={openInNewTab} disabled={!previewUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
            {previewCert && (
              <Button onClick={() => onDownload(previewCert)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
