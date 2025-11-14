import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Prefetch common queries when user logs in
  useEffect(() => {
    if (!user?.id) return;

    // Prefetch History (generated assets)
    queryClient.prefetchQuery({
      queryKey: ['generated_assets', user.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('generated_assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch Profile
    queryClient.prefetchQuery({
      queryKey: ['profile', user.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        return data;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes - profile changes less frequently
    });
  }, [user?.id, queryClient]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (!error) {
      navigate("/");
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!error) {
      navigate("/");
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear any pending toasts or overlays
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      toasts.forEach(toast => toast.remove());
      
      // Clear body overflow lock
      if (document.body) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }

      // Clear any modal states
      const modals = document.querySelectorAll('[role="dialog"]');
      modals.forEach(modal => {
        const backdrop = modal.parentElement;
        if (backdrop) backdrop.remove();
      });

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Navigate to signed-out page immediately
      navigate("/signed-out", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      // Still navigate even if there's an error
      navigate("/signed-out", { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
