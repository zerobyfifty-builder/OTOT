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

export const LodgeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const sessionToken = localStorage.getItem('lodge_session_token');
    const lodgeId = localStorage.getItem('lodge_id');

    if (sessionToken && lodgeId) {
      validateSession(sessionToken, lodgeId);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSession = async (sessionToken: string, lodgeId: string) => {
    try {
      const { data, error } = await supabase
        .from('lodge_sessions')
        .select('lodge_id, lodges(id, name, location, username)')
        .eq('session_token', sessionToken)
        .eq('lodge_id', lodgeId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        localStorage.removeItem('lodge_session_token');
        localStorage.removeItem('lodge_id');
        setLodge(null);
      } else {
        const lodgeData = Array.isArray(data.lodges) ? data.lodges[0] : data.lodges;
        setLodge(lodgeData as Lodge);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      localStorage.removeItem('lodge_session_token');
      localStorage.removeItem('lodge_id');
      setLodge(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // First check if lodge exists and password matches
      const { data: lodgeData, error: lodgeError } = await supabase
        .from('lodges')
        .select('id, name, location, username, password_hash')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (lodgeError || !lodgeData) {
        return { error: { message: 'Invalid username or password' } };
      }

      // Simple password check (in production, use proper hashing like bcrypt)
      if (lodgeData.password_hash !== password) {
        return { error: { message: 'Invalid username or password' } };
      }

      // Create session token
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const { error: sessionError } = await supabase
        .from('lodge_sessions')
        .insert({
          lodge_id: lodgeData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        });

      if (sessionError) {
        return { error: sessionError };
      }

      // Store session
      localStorage.setItem('lodge_session_token', sessionToken);
      localStorage.setItem('lodge_id', lodgeData.id);

      setLodge({
        id: lodgeData.id,
        name: lodgeData.name,
        location: lodgeData.location,
        username: lodgeData.username,
      });

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const sessionToken = localStorage.getItem('lodge_session_token');
    
    if (sessionToken) {
      await supabase
        .from('lodge_sessions')
        .delete()
        .eq('session_token', sessionToken);
    }

    localStorage.removeItem('lodge_session_token');
    localStorage.removeItem('lodge_id');
    setLodge(null);
  };

  const value = {
    lodge,
    loading,
    signIn,
    signOut,
  };

  return <LodgeAuthContext.Provider value={value}>{children}</LodgeAuthContext.Provider>;
};
