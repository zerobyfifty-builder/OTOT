import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { PledgeCertificate } from "@/components/certificates/PledgeCertificate";
import { TreeCertificate } from "@/components/certificates/TreeCertificate";
import type { CertificateRecord } from "@/types/otot";
import ktbLogo from "@/assets/ktb-dual-logo.png";
import kfsLogo from "@/assets/mau-forest-complex-logo.jpeg";

async function imageDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load certificate artwork.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not load certificate artwork."));
    reader.readAsDataURL(blob);
  });
}

export async function generateCertificate(certificate: CertificateRecord): Promise<Blob> {
  if (!globalThis.Buffer) {
    const { Buffer } = await import("buffer");
    globalThis.Buffer = Buffer;
  }
  const [ktbLogoDataUrl, kfsLogoDataUrl] = await Promise.all([
    imageDataUrl(ktbLogo),
    imageDataUrl(kfsLogo),
  ]);
  const date = new Date(certificate.issuedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const appUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const qrCodeDataUrl = await QRCode.toDataURL(`${appUrl}/verify/${encodeURIComponent(certificate.id)}`, {
    width: 200,
    margin: 1,
    color: { dark: "#2f7c49", light: "#ffffff" },
  });
  if (certificate.certificateType === "Pledge") {
    return pdf(
      <PledgeCertificate
        userName={certificate.userName}
        date={date}
        certificateId={certificate.id}
        ototId={certificate.userId}
        qrCodeDataUrl={qrCodeDataUrl}
        ktbLogoDataUrl={ktbLogoDataUrl}
        kfsLogoDataUrl={kfsLogoDataUrl}
      />,
    ).toBlob();
  }
  return pdf(
    <TreeCertificate
      userName={certificate.userName}
      numTrees={certificate.numTrees ?? 0}
      date={date}
      certificateId={certificate.id}
      ototId={certificate.userId}
      co2Offset={certificate.co2Offset ?? 0}
      location={certificate.location ?? "Kenya"}
      qrCodeDataUrl={qrCodeDataUrl}
      ktbLogoDataUrl={ktbLogoDataUrl}
      kfsLogoDataUrl={kfsLogoDataUrl}
    />,
  ).toBlob();
}
