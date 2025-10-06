import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PledgeSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'certificate' | 'plant';
}

const countries = [
  "Kenya", "Uganda", "Tanzania", "Rwanda", "United States", "United Kingdom", 
  "Germany", "France", "Netherlands", "Canada", "Australia", "Other"
];

export function PledgeSignupModal({ open, onOpenChange, action }: PledgeSignupModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [agreedToUpdates, setAgreedToUpdates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !country) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (showLogin) {
        // Login flow
        const { error } = await signIn(email, password);
        
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Update pledge status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('users')
            .update({ 
              pledge_status: true, 
              pledge_date: new Date().toISOString() 
            })
            .eq('user_id', user.id);
        }

        sessionStorage.removeItem('pledge-progress');
        
        toast({
          title: "Welcome back!",
          description: "Pledge completed successfully.",
        });

        if (action === 'certificate') {
          navigate('/dashboard');
        } else {
          navigate('/carbon-calculator');
        }
      } else {
        // Signup flow
        const { error } = await signUp(email, password);

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
            });
            setShowLogin(true);
            setLoading(false);
            return;
          }

          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Update user profile with country and pledge status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('users')
            .update({ 
              pledge_status: true, 
              pledge_date: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }

        sessionStorage.removeItem('pledge-progress');

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account and download your certificate.",
        });

        onOpenChange(false);
        navigate('/auth/verify-email');
      }
    } catch (error) {
      console.error('Error during auth:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showLogin ? 'Sign In to Continue' : 'Complete Your Pledge'}
          </DialogTitle>
          <DialogDescription>
            {showLogin 
              ? 'Sign in to your account to complete the pledge'
              : 'Create an account to receive your certificate and plant trees'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {!showLogin && (
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={country} onValueChange={setCountry} disabled={loading}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!showLogin && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="updates"
                checked={agreedToUpdates}
                onCheckedChange={(checked) => setAgreedToUpdates(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="updates"
                className="text-sm text-muted-foreground cursor-pointer leading-tight"
              >
                I agree to receive my pledge certificate and occasional updates about OTOT's conservation efforts
              </label>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {showLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              showLogin ? 'Sign In & Complete Pledge' : 'Complete Pledge & Continue'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowLogin(!showLogin)}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {showLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
