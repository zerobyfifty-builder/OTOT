import { Download, Eye, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface CertificateDialogItem {
  id: string;
  certificate_type: string;
  issued_date: string;
  certificate_url: string;
}

interface CertificateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: CertificateDialogItem[];
  previewLoading: string | null;
  downloadingCertId: string | null;
  onPreview: (certificate: CertificateDialogItem) => void;
  onDownload: (certificate: CertificateDialogItem) => void;
}

const getCertificateTitle = (certificateType: string) => {
  return certificateType === 'Pledge' ? 'Pledge Certificate' : 'Tree Planting Certificate';
};

export const CertificateSelectionDialog = ({
  open,
  onOpenChange,
  certificates,
  previewLoading,
  downloadingCertId,
  onPreview,
  onDownload,
}: CertificateSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6" />
            Select Certificate
          </DialogTitle>
          <DialogDescription className="text-base">
            Preview or download your certificates
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-background px-5 py-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-foreground">
                  {getCertificateTitle(certificate.certificate_type)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(certificate.issued_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full"
                  disabled={previewLoading === certificate.id}
                  onClick={() => onPreview(certificate)}
                  title="Preview"
                >
                  {previewLoading === certificate.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full"
                  disabled={downloadingCertId === certificate.id}
                  onClick={() => onDownload(certificate)}
                  title="Download"
                >
                  {downloadingCertId === certificate.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
