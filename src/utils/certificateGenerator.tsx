import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { PledgeCertificate } from '@/components/certificates/PledgeCertificate';
import { TreeCertificate } from '@/components/certificates/TreeCertificate';
import { imageToBase64 } from '@/utils/imageToBase64';
import ktbDualLogo from '@/assets/ktb-dual-logo.png';
import kfsLogo2 from '@/assets/kfs-logo-2.png';

type GlobalWithBuffer = typeof globalThis & {
  Buffer?: typeof import('buffer').Buffer;
};

const ensureBuffer = async () => {
  const globalWithBuffer = globalThis as GlobalWithBuffer;

  if (!globalWithBuffer.Buffer) {
    const { Buffer } = await import('buffer');
    globalWithBuffer.Buffer = Buffer;
  }
};

interface GeneratePledgeCertificateParams {
  userName: string;
  userId: string;
  ototId?: string;
}

interface GenerateTreeCertificateParams {
  userName: string;
  userId: string;
  numTrees: number;
  co2Offset: number;
  ototId: string;
  location?: string;
}

const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: '#2f7c49',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

let cachedKtbLogo: string | null = null;
let cachedKfsLogo: string | null = null;

const getLogos = async () => {
  if (!cachedKtbLogo) {
    cachedKtbLogo = await imageToBase64(ktbDualLogo).catch(() => '');
  }
  if (!cachedKfsLogo) {
    cachedKfsLogo = await imageToBase64(kfsLogo2).catch(() => '');
  }
  return { ktbLogoDataUrl: cachedKtbLogo, kfsLogoDataUrl: cachedKfsLogo };
};

export const generatePledgeCertificate = async ({
  userName,
  userId,
  ototId,
}: GeneratePledgeCertificateParams): Promise<Blob> => {
  await ensureBuffer();

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const certificateId = `PLD-${Date.now()}-${userId.substring(0, 8)}`;
  const verificationUrl = `${window.location.origin}/verify/${certificateId}`;
  const [qrCodeDataUrl, logos] = await Promise.all([
    generateQRCode(verificationUrl),
    getLogos(),
  ]);

  // Save certificate record to database
  try {
    await supabase.from('certificates').insert({
      user_id: userId,
      certificate_type: 'Pledge',
      certificate_url: verificationUrl,
      issued_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving certificate to database:', error);
  }

  const blob = await pdf(
    <PledgeCertificate
      userName={userName}
      date={date}
      certificateId={certificateId}
      ototId={ototId}
      qrCodeDataUrl={qrCodeDataUrl}
      ktbLogoDataUrl={logos.ktbLogoDataUrl}
      kfsLogoDataUrl={logos.kfsLogoDataUrl}
    />
  ).toBlob();
  
  return blob;
};

export const generateTreeCertificate = async ({
  userName,
  userId,
  numTrees,
  co2Offset,
  ototId,
  location,
}: GenerateTreeCertificateParams): Promise<Blob> => {
  await ensureBuffer();

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const certificateId = `TRE-${Date.now()}-${userId.substring(0, 8)}`;
  const verificationUrl = `${window.location.origin}/verify/${certificateId}`;
  const [qrCodeDataUrl, logos] = await Promise.all([
    generateQRCode(verificationUrl),
    getLogos(),
  ]);

  // Save certificate record to database
  try {
    await supabase.from('certificates').insert({
      user_id: userId,
      certificate_type: 'Tree Planting',
      certificate_url: verificationUrl,
      issued_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving certificate to database:', error);
  }

  const blob = await pdf(
    <TreeCertificate
      userName={userName}
      numTrees={numTrees}
      date={date}
      certificateId={certificateId}
      ototId={ototId}
      co2Offset={co2Offset}
      location={location}
      qrCodeDataUrl={qrCodeDataUrl}
      ktbLogoDataUrl={logos.ktbLogoDataUrl}
      kfsLogoDataUrl={logos.kfsLogoDataUrl}
    />
  ).toBlob();
  
  return blob;
};

export const downloadCertificate = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
