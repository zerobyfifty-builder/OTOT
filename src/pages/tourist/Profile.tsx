import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Download, Globe, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { apiErrorMessage, apiFetch } from "@/lib/api";
import { TouristPage } from "@/components/layout/TouristPage";
import { CountrySelector } from "@/components/CountrySelector";
import { CertificateSelectionDialog } from "@/components/certificates/CertificateSelectionDialog";
import { PdfPreviewDialog, type PdfPreviewFile } from "@/components/ui/PdfPreviewDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCertificate } from "@/utils/downloadCertificate";
import type { AuthUser, CertificateRecord, TouristProfile } from "@/types/otot";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(6, "Use at least 6 characters"),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords don't match",
});

type AuthUpdate = { token: string; user: AuthUser };

export default function Profile() {
  const { session, applyUpdatedAuth } = useAuth();
  const userId = session?.userId;
  const [profile, setProfile] = useState<TouristProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PdfPreviewFile | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    apiFetch<{ profile: TouristProfile }>("/v1/auth/profile")
      .then(({ profile: next }) => {
        if (cancelled) return;
        setProfile(next);
        setFirstName(next.firstName);
        setLastName(next.lastName);
        setCountry(next.country);
        setPhoneNumber(next.phoneNumber);
        setDateOfBirth(next.dateOfBirth);
        setEmail(next.email);
      })
      .catch((err: unknown) => { if (!cancelled) toast.error(apiErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [userId]);

  if (!session) return null;

  const initials = (profile?.name || session.name).trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!firstName.trim()) { toast.error("First name is required."); return; }
    setSavingProfile(true);
    try {
      const result = await apiFetch<{ profile: TouristProfile } & AuthUpdate>("/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName, country, phoneNumber, dateOfBirth }),
      });
      setProfile(result.profile);
      applyUpdatedAuth(result.token, result.user);
      toast.success("Profile updated successfully");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setSavingProfile(false); }
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Enter a valid email"); return; }
    setSavingEmail(true);
    try {
      const result = await apiFetch<AuthUpdate>("/v1/auth/email", {
        method: "PATCH", body: JSON.stringify({ email: parsed.data }),
      });
      applyUpdatedAuth(result.token, result.user);
      setProfile((current) => current ? { ...current, email: result.user.email } : current);
      toast.success("Email updated successfully");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setSavingEmail(false); }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Check your password"); return; }
    setSavingPassword(true);
    try {
      await apiFetch("/v1/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setSavingPassword(false); }
  };

  const openCertificates = async () => {
    setLoadingCertificates(true);
    try {
      const result = await apiFetch<{ certificates: CertificateRecord[] }>("/v1/auth/certificates");
      if (!result.certificates.length) { toast.info("No certificates available yet"); return; }
      setCertificates(result.certificates);
      setCertificateDialogOpen(true);
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoadingCertificates(false); }
  };

  const certificateFileName = (certificate: CertificateRecord) =>
    `${certificate.certificateType === "Pledge" ? "pledge" : "tree"}-certificate-${certificate.id}.pdf`;

  const previewCertificate = async (certificate: CertificateRecord) => {
    setPreviewLoading(certificate.id);
    try {
      const { generateCertificate } = await import("@/utils/certificateGenerator");
      const blob = await generateCertificate(certificate);
      setPreviewFile({ blob, name: certificateFileName(certificate) });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setPreviewLoading(null); }
  };

  const downloadSelectedCertificate = async (certificate: CertificateRecord) => {
    setDownloadLoading(certificate.id);
    try {
      const { generateCertificate } = await import("@/utils/certificateGenerator");
      downloadCertificate(await generateCertificate(certificate), certificateFileName(certificate));
      toast.success("Certificate downloaded");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setDownloadLoading(null); }
  };

  return (
    <TouristPage className="max-w-6xl">
      <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Personal Information</CardTitle>
              <CardDescription>Your name and details will appear on certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">{initials || "T"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Profile</p>
                  <p className="text-xs text-muted-foreground">{profile?.name || session.name}</p>
                </div>
              </div>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Phone Number</Label><Input id="phone" type="tel" placeholder="+254 700 000 000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="dob" className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Date of Birth</Label><Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="country" className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Country</Label><CountrySelector value={country} onChange={setCountry} /></div>
                <Button type="submit" disabled={savingProfile} className="w-full">{savingProfile ? "Saving..." : "Save Profile"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle>Account Overview</CardTitle><CardDescription>Your account details and carbon offset status</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium break-all">{profile?.email || session.email}</p></div>
                <div><p className="text-muted-foreground">Account Created</p><p className="font-medium">{profile ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p></div>
              </div>
              <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Pledge Status:</span><Badge variant={profile?.pledgeAt ? "default" : "secondary"}>{profile?.pledgeAt ? `Active since ${new Date(profile.pledgeAt).toLocaleDateString()}` : "Not Active"}</Badge></div>
              <div className="text-sm"><p className="text-muted-foreground">Total Contributions</p><p className="font-medium">${(profile?.totalContributions ?? 0).toLocaleString()}</p></div>
              <Button onClick={openCertificates} variant="outline" className="w-full" disabled={loadingCertificates}>
                <Download className="h-4 w-4 mr-2" />{loadingCertificates ? "Loading certificates..." : "Download Certificates"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle>Update Email</CardTitle><CardDescription>Change your account email address</CardDescription></CardHeader>
            <CardContent><form onSubmit={saveEmail} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">New Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><Button type="submit" disabled={savingEmail}>{savingEmail ? "Updating..." : "Update Email"}</Button></form></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Update your account password</CardDescription></CardHeader>
            <CardContent><form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required /></div>
              <div className="space-y-2"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required /></div>
              <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required /></div>
              <Button type="submit" disabled={savingPassword}>{savingPassword ? "Updating..." : "Update Password"}</Button>
            </form></CardContent>
          </Card>
        </div>
      </div>

      <CertificateSelectionDialog open={certificateDialogOpen} onOpenChange={setCertificateDialogOpen}
        certificates={certificates} previewLoading={previewLoading} downloadingCertId={downloadLoading}
        onPreview={previewCertificate} onDownload={downloadSelectedCertificate} />
      <PdfPreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} showShare
        title={previewFile?.name || "Certificate Preview"}
        description="Preview your certificate below, open it in a new tab, or download it."
        onDownload={(file) => downloadCertificate(file.blob, file.name)} />
    </TouristPage>
  );
}
