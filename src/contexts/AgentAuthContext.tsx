import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Agent {
  id: string;
  name: string;
  business_name: string;
  email: string;
  username: string;
}

interface AgentAuthContextType {
  agent: Agent | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

export const useAgentAuth = () => {
  const context = useContext(AgentAuthContext);
  if (!context) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return context;
};

export const AgentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionToken = localStorage.getItem('agent_session_token');
    const agentId = localStorage.getItem('agent_id');

    if (sessionToken && agentId) {
      validateSession(sessionToken, agentId);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSession = async (sessionToken: string, agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('travel_agent_sessions')
        .select('agent_id, travel_agents(id, name, business_name, email, username)')
        .eq('session_token', sessionToken)
        .eq('agent_id', agentId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        localStorage.removeItem('agent_session_token');
        localStorage.removeItem('agent_id');
        setAgent(null);
      } else {
        const agentData = Array.isArray(data.travel_agents) ? data.travel_agents[0] : data.travel_agents;
        setAgent(agentData as Agent);
      }
    } catch (error) {
      console.error('Agent session validation error:', error);
      localStorage.removeItem('agent_session_token');
      localStorage.removeItem('agent_id');
      setAgent(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data: agentData, error: agentError } = await supabase
        .from('travel_agents')
        .select('id, name, business_name, email, username, password_hash')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (agentError || !agentData) {
        return { error: { message: 'Invalid username or password' } };
      }

      if (agentData.password_hash !== password) {
        return { error: { message: 'Invalid username or password' } };
      }

      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: sessionError } = await supabase
        .from('travel_agent_sessions')
        .insert({
          agent_id: agentData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        });

      if (sessionError) {
        return { error: sessionError };
      }

      localStorage.setItem('agent_session_token', sessionToken);
      localStorage.setItem('agent_id', agentData.id);

      setAgent({
        id: agentData.id,
        name: agentData.name,
        business_name: agentData.business_name,
        email: agentData.email,
        username: agentData.username || '',
      });

      return { error: null };
    } catch (error) {
      console.error('Agent sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const sessionToken = localStorage.getItem('agent_session_token');
    
    if (sessionToken) {
      await supabase
        .from('travel_agent_sessions')
        .delete()
        .eq('session_token', sessionToken);
    }

    localStorage.removeItem('agent_session_token');
    localStorage.removeItem('agent_id');
    setAgent(null);
  };

  return (
    <AgentAuthContext.Provider value={{ agent, loading, signIn, signOut }}>
      {children}
    </AgentAuthContext.Provider>
  );
};
