import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Agent {
  id: string;
  name: string;
  business_name: string;
  email: string;
  username: string;
  auth_user_id: string;
}

interface AgentAuthContextType {
  agent: Agent | null;
  loading: boolean;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change callback
          setTimeout(() => checkIfAgent(session.user), 0);
        } else {
          setAgent(null);
          setLoading(false);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkIfAgent(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfAgent = async (user: User) => {
    try {
      // Check if user has travel_agent role
      const { data: userRole } = await supabase
        .rpc('get_user_role', { input_user_id: user.id });

      if (userRole === 'travel_agent') {
        // Get agent details from travel_agents table by email
        const { data: agentData, error } = await supabase
          .from('travel_agents')
          .select('id, name, business_name, email, username')
          .eq('email', user.email!)
          .eq('is_active', true)
          .single();

        if (!error && agentData) {
          setAgent({
            id: agentData.id,
            name: agentData.name,
            business_name: agentData.business_name,
            email: agentData.email,
            username: agentData.username || '',
            auth_user_id: user.id,
          });
        } else {
          setAgent(null);
        }
      } else {
        setAgent(null);
      }
    } catch (error) {
      console.error('Agent check error:', error);
      setAgent(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAgent(null);
  };

  return (
    <AgentAuthContext.Provider value={{ agent, loading, signOut }}>
      {children}
    </AgentAuthContext.Provider>
  );
};
