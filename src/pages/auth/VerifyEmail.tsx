import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function VerifyEmail() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for auth hash in URL (email verification callback)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Handle both magic link and email verification callbacks
    if (accessToken) {
      // User just verified their email or used magic link
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      }).then(({ data, error }) => {
        if (!error && data.session) {
          // Successfully verified and logged in
          
          // Check if there's a stored redirect URL from magic link flow
          const redirectUrl = sessionStorage.getItem('magic_link_redirect');
          if (redirectUrl) {
            sessionStorage.removeItem('magic_link_redirect');
            
            // If redirecting to carbon calculator, set flag to freeze sidebar
            if (redirectUrl === '/carbon-calculator') {
              sessionStorage.setItem('carbon_calculator_flow_active', 'true');
            }
            
            navigate(redirectUrl);
          } else {
            // Default to dashboard
            navigate('/dashboard');
          }
        } else {
          // If there's an error, show login page
          navigate('/auth/login');
        }
      });
      return;
    }

    // If user is already verified and logged in, redirect to dashboard
    if (user?.email_confirmed_at) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a verification link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Click the verification link in your email to activate your account
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Once verified, you'll be able to download your pledge certificate
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Start planting trees to offset your carbon footprint
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth/login')}
            >
              Return to Login
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              The verification link expires in 24 hours
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
