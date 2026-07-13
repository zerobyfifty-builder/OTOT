import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createActivityLogEntry } from '@/hooks/useActivityLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any; alreadyRegistered?: boolean; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user?.id) {
          void createActivityLogEntry({
            userId: session.user.id,
            action_type: 'login',
            resource_type: 'auth',
            description: 'Signed in to owner portal',
            metadata: { event },
          });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/auth/verify-email`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    // Supabase's email-enumeration protection: signing up with an email that is
    // already registered returns NO error and a user whose `identities` array is
    // empty (no new identity was created). Surface that so the UI can tell the
    // user to sign in instead of pretending a brand-new account was created.
    const alreadyRegistered =
      !error &&
      !!data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0;

    // A fresh signup with no session means email confirmation is still pending.
    const needsEmailConfirmation = !error && !alreadyRegistered && !data?.session;

    return { error, alreadyRegistered, needsEmailConfirmation };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    if (user?.id) {
      void createActivityLogEntry({
        userId: user.id,
        action_type: 'logout',
        resource_type: 'auth',
        description: 'Signed out of owner portal',
      });
    }
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/verify-email`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendConfirmation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};