import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CertificateRecord } from "@/types/otot";

export function CertificateSelectionDialog({
  open,
  onOpenChange,
  certificates,
  previewLoading,
  downloadingCertId,
  onPreview,
  onDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: CertificateRecord[];
  previewLoading: string | null;
  downloadingCertId: string | null;
  onPreview: (certificate: CertificateRecord) => void;
  onDownload: (certificate: CertificateRecord) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl"><FileText className="h-6 w-6" /> Select Certificate</DialogTitle>
          <DialogDescription className="text-base">Preview or download your certificates</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="flex items-center gap-4 rounded-2xl border border-border bg-background px-5 py-4 shadow-sm transition-colors hover:bg-muted/30">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText className="h-7 w-7" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-foreground">{certificate.certificateType === "Pledge" ? "Pledge Certificate" : "Tree Planting Certificate"}</p>
                <p className="text-sm text-muted-foreground">{new Date(certificate.issuedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full" disabled={previewLoading === certificate.id} onClick={() => onPreview(certificate)} aria-label="Preview certificate">
                  {previewLoading === certificate.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Eye className="h-5 w-5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full" disabled={downloadingCertId === certificate.id} onClick={() => onDownload(certificate)} aria-label="Download certificate">
                  {downloadingCertId === certificate.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Download className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
