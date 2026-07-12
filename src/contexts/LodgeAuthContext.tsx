import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lodge {
  id: string;
  name: string;
  location: string;
  username: string;
}

interface LodgeAuthContextType {
  lodge: Lodge | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const LodgeAuthContext = createContext<LodgeAuthContextType | undefined>(undefined);

export const useLodgeAuth = () => {
  const context = useContext(LodgeAuthContext);
  if (!context) {
    throw new Error('useLodgeAuth must be used within a LodgeAuthProvider');
  }
  return context;
};

const SESSION_KEY = 'lodge_session_token';
const LODGE_KEY = 'lodge_id';

export const LodgeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore an existing session by validating it server-side. The browser no
    // longer reads lodge_sessions directly (RLS now denies anon access).
    const sessionToken = localStorage.getItem(SESSION_KEY);
    const lodgeId = localStorage.getItem(LODGE_KEY);

    if (sessionToken && lodgeId) {
      validateSession(sessionToken, lodgeId);
    } else {
      setLoading(false);
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LODGE_KEY);
    setLodge(null);
  };

  const validateSession = async (sessionToken: string, lodgeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('lodge-session-validate', {
        body: { sessionToken, lodgeId },
      });

      if (error || !data?.valid || !data?.lodge) {
        clearSession();
      } else {
        setLodge(data.lodge as Lodge);
      }
    } catch (err) {
      console.error('Session validation error:', err);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('lodge-login', {
        body: { username, password },
      });

      // Edge function returns non-2xx (e.g. 401) as a FunctionsHttpError; surface a
      // generic message so we never distinguish "bad user" from "bad password".
      if (error) {
        return { error: { message: 'Invalid username or password' } };
      }
      if (!data?.sessionToken || !data?.lodge) {
        return { error: { message: data?.error || 'Invalid username or password' } };
      }

      localStorage.setItem(SESSION_KEY, data.sessionToken);
      localStorage.setItem(LODGE_KEY, data.lodge.id);
      setLodge(data.lodge as Lodge);

      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: { message: 'Invalid username or password' } };
    }
  };

  const signOut = async () => {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    if (sessionToken) {
      // Best-effort server-side revoke; the session table is service-role only.
      try {
        await supabase.functions.invoke('lodge-logout', {
          body: { sessionToken },
        });
      } catch {
        // ignore — we still clear local state below
      }
    }
    clearSession();
  };

  const value = {
    lodge,
    loading,
    signIn,
    signOut,
  };

  return <LodgeAuthContext.Provider value={value}>{children}</LodgeAuthContext.Provider>;
};
