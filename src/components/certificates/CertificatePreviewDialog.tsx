/**
 * Backward-compatible wrapper around the unified PdfPreviewDialog.
 * Existing consumers keep working without changes.
 */
import { PdfPreviewDialog, type PdfPreviewFile } from '@/components/ui/PdfPreviewDialog';

export type CertificatePreviewFile = PdfPreviewFile;

interface CertificatePreviewDialogProps {
  previewCert: CertificatePreviewFile | null;
  onClose: () => void;
  onDownload: (certificate: CertificatePreviewFile) => void;
}

export const CertificatePreviewDialog = ({
  previewCert,
  onClose,
  onDownload,
}: CertificatePreviewDialogProps) => (
  <PdfPreviewDialog
    file={previewCert}
    onClose={onClose}
    onDownload={onDownload}
    title={previewCert?.name || 'Certificate Preview'}
    description="Preview your certificate below, open it in a new tab, or download it."
    showShare
  />
);
