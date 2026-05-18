import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { User, Lock, Building2, Bell, Shield, Mail, Phone, Globe } from 'lucide-react';
import { PlantingCostsTab } from '@/components/settings/PlantingCostsTab';
import { PlantingCostsKTBTab } from '@/components/settings/PlantingCostsKTBTab';

const SUPABASE_URL = "https://iezhssfzbiwnofhpjahv.supabase.co";

interface OrgDetails {
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_person: string | null;
  website: string | null;
  category: string;
  is_active: boolean;
}

interface UserDetails {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
}

export const OwnerSettings = () => {
  const { user } = useAuth();
  const [orgDetails, setOrgDetails] = useState<OrgDetails | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerType, setOwnerType] = useState<'plantation' | 'institutional'>('plantation');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user details with role and org info
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone_number, organization_id, roles!inner(name), organizations!inner(category, partner_types(name))')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userData) {
          setUserDetails({
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            phone_number: userData.phone_number,
          });
          setFirstName(userData.first_name || '');
          setLastName(userData.last_name || '');
          setPhoneNumber(userData.phone_number || '');
          setNewEmail(userData.email);

          // Determine owner type
          const roleName = (userData.roles as any)?.name || '';
          const orgCategory = (userData.organizations as any)?.category || '';
          const ptName = (userData.organizations as any)?.partner_types?.name || '';
          if (roleName === 'institutional_partner' || orgCategory === 'institutional' || ptName.toLowerCase().includes('institutional')) {
            setOwnerType('institutional');
          }

          // Fetch org details
          if (userData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('name, contact_email, contact_phone, contact_person, website, category, is_active')
              .eq('id', userData.organization_id)
              .maybeSingle();
            if (orgData) setOrgDetails(orgData);
          }
        }
      } catch (err) {
        console.error('Error fetching settings data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone_number: phoneNumber.trim() || null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
      setUserDetails(prev => prev ? {
        ...prev,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_number: phoneNumber.trim() || null,
      } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      toast.success('Verification email sent to new address. Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and organization settings</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="planting-costs">Planting Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6 mt-4">

      {/* Organization Info (Read-only) */}
      {orgDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Organization</CardTitle>
                <CardDescription>Your organization details (managed by admin)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Organization Name</Label>
                <p className="font-medium">{orgDetails.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Category</Label>
                <p className="font-medium capitalize">{orgDetails.category}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Contact Person</Label>
                <p className="font-medium">{orgDetails.contact_person || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Contact Email</Label>
                <p className="font-medium">{orgDetails.contact_email || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Contact Phone</Label>
                <p className="font-medium">{orgDetails.contact_phone || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Website</Label>
                <p className="font-medium">{orgDetails.website || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Badge variant={orgDetails.is_active ? 'default' : 'secondary'}>
                {orgDetails.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateProfile} disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Address</CardTitle>
              <CardDescription>Update your login email address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              A verification email will be sent to the new address.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleUpdateEmail}
              disabled={emailLoading || newEmail === userDetails?.email}
            >
              {emailLoading ? 'Sending...' : 'Update Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Account security information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Account ID</p>
              <p className="text-xs text-muted-foreground font-mono">{user?.id || '—'}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Last Sign In</p>
              <p className="text-xs text-muted-foreground">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auth Provider</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.app_metadata?.provider || 'email'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="planting-costs" className="mt-4">
          {ownerType === 'institutional' ? <PlantingCostsKTBTab /> : <PlantingCostsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerSettings;
