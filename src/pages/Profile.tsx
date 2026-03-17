import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, DollarSign, User, Globe, FileText } from 'lucide-react';
import { z } from 'zod';
import { generatePledgeCertificate, generateTreeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
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
        .select('pledge_status, pledge_date, total_donation, otot_id, first_name, last_name, country')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data as UserProfile);
      setFirstName((data as any)?.first_name || '');
      setLastName((data as any)?.last_name || '');
      setCountry((data as any)?.country || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
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
    
    const result = updatePasswordSchema.safeParse({ 
      currentPassword, 
      newPassword, 
      confirmPassword 
    });
    
    if (!result.success) {
      const fieldErrors: { 
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {};
      
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
        // Single certificate - download directly
        await handleSingleCertDownload(data[0]);
      } else {
        // Multiple certificates - show selection dialog
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

  const handleSingleCertDownload = async (cert: CertificateRecord) => {
    if (!user) return;
    setDownloadingCertId(cert.id);
    
    try {
      const userName = getUserFullName();
      const { data: userData } = await supabase
        .from('users')
        .select('otot_id')
        .eq('user_id', user.id)
        .single();

      let blob: Blob;
      if (cert.certificate_type === 'Pledge') {
        blob = await generatePledgeCertificate({
          userName,
          userId: user.id,
          ototId: userData?.otot_id,
        });
        downloadCertificate(blob, `pledge-certificate-${userName}.pdf`);
      } else {
        // For tree certificates, generate with minimal info
        blob = await generateTreeCertificate({
          userName,
          userId: user.id,
          numTrees: 1,
          co2Offset: 22,
          ototId: userData?.otot_id || '',
        });
        downloadCertificate(blob, `tree-certificate-${userName}.pdf`);
      }
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloadingCertId(null);
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
                  Your name will appear on certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                  <div className="space-y-2">
                    <Label htmlFor="country" className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      Country
                    </Label>
                    <Input
                      id="country"
                      placeholder="e.g. Kenya, United States, Germany"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
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
              Choose which certificate you'd like to download
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {certificates.map((cert) => (
              <button
                key={cert.id}
                onClick={() => handleSingleCertDownload(cert)}
                disabled={downloadingCertId === cert.id}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors text-left disabled:opacity-60"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  cert.certificate_type === 'Pledge' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30' 
                    : 'bg-blue-50 dark:bg-blue-950/30'
                }`}>
                  {downloadingCertId === cert.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  ) : (
                    <FileText className={`h-4 w-4 ${
                      cert.certificate_type === 'Pledge' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cert.certificate_type} Certificate</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cert.issued_date).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
