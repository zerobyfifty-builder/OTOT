import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CertificateRecord } from "@/types/otot";
import ktbLogo from "@/assets/ktb-logo.png";

export default function VerifyCertificate() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    apiFetch<{ certificate: CertificateRecord }>(`/v1/auth/certificates/verify/${encodeURIComponent(id)}`)
      .then(({ certificate: result }) => { if (!cancelled) setCertificate(result); })
      .catch(() => { if (!cancelled) setCertificate(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <img src={ktbLogo} alt="Kenya Tourism Board" className="h-16 mb-8 object-contain" />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {certificate ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6" />}
            {loading ? "Checking certificate" : certificate ? "Verified OTOT Certificate" : "Certificate not found"}
          </CardTitle>
          <CardDescription>{certificate ? "This certificate matches an OTOT record." : "One Tourist One Tree"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {certificate ? (
            <>
              <p><span className="text-muted-foreground">Presented to:</span> <strong>{certificate.userName}</strong></p>
              <p><span className="text-muted-foreground">Type:</span> {certificate.certificateType} Certificate</p>
              <p><span className="text-muted-foreground">Issued:</span> {new Date(certificate.issuedDate).toLocaleDateString()}</p>
              {certificate.numTrees !== undefined && <p><span className="text-muted-foreground">Trees planted:</span> {certificate.numTrees}</p>}
              <p className="break-all text-xs text-muted-foreground">ID: {certificate.id}</p>
            </>
          ) : !loading ? <p className="text-muted-foreground">Check the certificate ID or ask the holder for a current copy.</p> : null}
          <Button asChild variant="outline"><Link to="/">Go to OTOT</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
