import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, DollarSign, User, Globe, FileText, Phone, Camera, Eye } from 'lucide-react';
import { z } from 'zod';
import { generatePledgeCertificate, generateTreeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import { CountrySelector } from '@/components/CountrySelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUPABASE_URL = "https://iezhssfzbiwnofhpjahv.supabase.co";

const updateEmailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface UserProfile {
  pledge_status: boolean;
  pledge_date: string | null;
  total_donation: number;
  otot_id: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
}

interface CertificateRecord {
  id: string;
  certificate_type: string;
  issued_date: string;
  certificate_url: string;
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<{ blob: Blob; name: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('pledge_status, pledge_date, total_donation, otot_id, first_name, last_name, country, phone_number, date_of_birth, profile_photo_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      const p = data as UserProfile;
      setProfile(p);
      setFirstName(p?.first_name || '');
      setLastName(p?.last_name || '');
      setCountry(p?.country || '');
      setPhoneNumber(p?.phone_number || '');
      setDateOfBirth(p?.date_of_birth || '');
      setProfilePhotoUrl(p?.profile_photo_url || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/profile-photos/${filePath}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_url: photoUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      setProfilePhotoUrl(photoUrl + '?t=' + Date.now());
      toast.success('Profile photo updated');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setProfileLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          country: country.trim() || null,
          phone_number: phoneNumber.trim() || null,
          date_of_birth: dateOfBirth || null,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = updateEmailSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: { email?: string } = {};
      result.error.errors.forEach((error) => {
        if (error.path[0] === 'email') fieldErrors.email = error.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success('Email update initiated. Please check your new email for confirmation.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = updatePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((error) => {
        if (error.path[0] === 'currentPassword') fieldErrors.currentPassword = error.message;
        if (error.path[0] === 'newPassword') fieldErrors.newPassword = error.message;
        if (error.path[0] === 'confirmPassword') fieldErrors.confirmPassword = error.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDownloadCertificates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, certificate_type, issued_date, certificate_url')
        .eq('user_id', user.id)
        .order('issued_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No certificates available for download');
        return;
      }

      if (data.length === 1) {
        await handleSingleCertDownload(data[0]);
      } else {
        setCertificates(data);
        setShowCertDialog(true);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to fetch certificates');
    }
  };

  const getUserFullName = () => {
    const fn = firstName?.trim();
    const ln = lastName?.trim();
    if (fn && ln) return `${fn} ${ln}`;
    if (fn) return fn;
    if (ln) return ln;
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'Guest';
  };

  const getInitials = () => {
    const fn = firstName?.trim();
    const ln = lastName?.trim();
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (fn) return fn[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const generateCertBlob = async (cert: CertificateRecord) => {
    const userName = getUserFullName();
    const { data: userData } = await supabase
      .from('users')
      .select('otot_id')
      .eq('user_id', user!.id)
      .single();

    if (cert.certificate_type === 'Pledge') {
      return generatePledgeCertificate({ userName, userId: user!.id, ototId: userData?.otot_id });
    } else {
      return generateTreeCertificate({
        userName,
        userId: user!.id,
        numTrees: 1,
        co2Offset: 22,
        ototId: userData?.otot_id || '',
      });
    }
  };

  const handleSingleCertDownload = async (cert: CertificateRecord) => {
    if (!user) return;
    setDownloadingCertId(cert.id);
    
    try {
      const blob = await generateCertBlob(cert);
      const userName = getUserFullName();
      const filename = cert.certificate_type === 'Pledge'
        ? `pledge-certificate-${userName}.pdf`
        : `tree-certificate-${userName}.pdf`;
      downloadCertificate(blob, filename);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handlePreviewCert = async (cert: CertificateRecord) => {
    setPreviewLoading(cert.id);
    try {
      const blob = await generateCertBlob(cert);
      const userName = getUserFullName();
      const filename = cert.certificate_type === 'Pledge'
        ? `pledge-certificate-${userName}.pdf`
        : `tree-certificate-${userName}.pdf`;
      setPreviewCert({ blob, name: filename });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your name and details will appear on certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Profile Photo */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      {profilePhotoUrl ? (
                        <AvatarImage src={profilePhotoUrl} alt="Profile photo" />
                      ) : null}
                      <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">
                      {photoUploading ? 'Uploading...' : 'Click photo to change (max 5MB)'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+254 700 000 000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob" className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Date of Birth
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      Country
                    </Label>
                    <CountrySelector value={country} onChange={setCountry} />
                  </div>
                  <Button type="submit" disabled={profileLoading} className="w-full">
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
                <CardDescription>
                  Your account details and carbon offset status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Created</Label>
                    <p className="font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {profile && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Pledge Status:</Label>
                      {profile.pledge_status ? (
                        <Badge variant="default" className="bg-primary/10 text-primary">
                          <Calendar className="h-3 w-3 mr-1" />
                          Active since {new Date(profile.pledge_date!).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Active</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Total Donations</Label>
                        <p className="font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {profile.total_donation}
                        </p>
                      </div>
                      {profile.otot_id && (
                        <div>
                          <Label className="text-sm text-muted-foreground">OTOT ID</Label>
                          <p className="font-medium font-mono text-sm">{profile.otot_id}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button onClick={handleDownloadCertificates} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Account Settings */}
          <div className="space-y-6">
            {/* Update Email */}
            <Card>
              <CardHeader>
                <CardTitle>Update Email</CardTitle>
                <CardDescription>
                  Change your account email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">New Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <Button type="submit" disabled={emailLoading}>
                    {emailLoading ? 'Updating...' : 'Update Email'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Update Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={errors.currentPassword ? 'border-destructive' : ''}
                      required
                    />
                    {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={errors.newPassword ? 'border-destructive' : ''}
                      required
                    />
                    {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={errors.confirmPassword ? 'border-destructive' : ''}
                      required
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Certificate Selection Dialog */}
      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Certificate
            </DialogTitle>
            <DialogDescription>
              Preview or download your certificates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-background"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  cert.certificate_type === 'Pledge' 
                    ? 'bg-primary/10' 
                    : 'bg-blue-50 dark:bg-blue-950/30'
                }`}>
                  <FileText className={`h-4 w-4 ${
                    cert.certificate_type === 'Pledge' 
                      ? 'text-primary' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cert.certificate_type} Certificate</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cert.issued_date).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={previewLoading === cert.id}
                    onClick={() => handlePreviewCert(cert)}
                    title="Preview"
                  >
                    {previewLoading === cert.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={downloadingCertId === cert.id}
                    onClick={() => handleSingleCertDownload(cert)}
                    title="Download"
                  >
                    {downloadingCertId === cert.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Dialog */}
      <Dialog open={!!previewCert} onOpenChange={() => setPreviewCert(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          {previewCert && (
            <div className="space-y-4">
              <div className="w-full h-[60vh] border border-border rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={URL.createObjectURL(previewCert.blob)}
                  className="w-full h-full"
                  title="Certificate Preview"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewCert(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  downloadCertificate(previewCert.blob, previewCert.name);
                  toast.success('Certificate downloaded');
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
