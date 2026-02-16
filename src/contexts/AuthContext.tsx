import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { mc } from "@/lib/microcopy";
import { useCanvasStore } from "@/store/canvasStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  sendOTP: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { message?: string; name?: string };
  const message = (maybeError.message ?? "").toLowerCase();
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
};

const clearStaleSupabaseAuthStorage = () => {
  if (typeof window === "undefined") return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  }
};

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
    let mounted = true;

    const recoverInvalidSession = async (error: unknown) => {
      console.warn("Recovering from invalid refresh token session:", error);
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      clearStaleSupabaseAuthStorage();

      if (!mounted) return;
      setSession(null);
      setUser(null);
      setLoading(false);
    };
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Track auth events asynchronously (don't block)
        setTimeout(() => {
          try {
            if (event === "SIGNED_IN" && session?.user) {
              analytics.identify(session.user.id);
              analytics.track("User Logged In", { success: true });

              supabase
                .from("profiles")
                .select("id, free_credits")
                .eq("id", session.user.id)
                .single()
                .then(async ({ data: profile, error: profileError }) => {
                  const email = session.user?.email ?? "";
                  if (profileError?.code === "PGRST116" || !profile) {
                    const { error: upsertErr } = await supabase.from("profiles").upsert(
                      { id: session.user.id, email, free_credits: 59 },
                      { onConflict: "id" }
                    );
                    if (!upsertErr) toast.success(mc.toasts.success.signupCredits);
                  } else if (profile && (profile.free_credits == null || profile.free_credits === 0)) {
                    await supabase.from("profiles").update({ free_credits: 59 }).eq("id", session.user.id);
                    toast.success(mc.toasts.success.signupCredits);
                  }
                  const { data: p } = await supabase.from("profiles").select("subscription_tier, free_credits").eq("id", session.user.id).single();
                  if (p) {
                    analytics.setUserProperties({ subscription_tier: p.subscription_tier || "free", credits: p.free_credits || 0 });
                  }
                });
            } else if (event === "SIGNED_OUT") {
              analytics.reset();
              analytics.track("User Logged Out", {
                success: true,
              });
            }
          } catch (error) {
            console.error("Analytics error:", error);
            // Don't block on analytics errors
          }
        }, 0);
      }
    );

    // THEN check for existing session with timeout
    const sessionPromise = supabase.auth
      .getSession()
      .catch((error) => ({ data: { session: null }, error }));
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { session: null }, error: null });
      }, 3000); // 3 second timeout
    });

    Promise.race([sessionPromise, timeoutPromise])
      .then(async (result: any) => {
        if (!mounted) return;

        if (result?.error) {
          if (isInvalidRefreshTokenError(result.error)) {
            await recoverInvalidSession(result.error);
            return;
          }
          console.error("Error getting session:", result.error);
          setLoading(false);
          return;
        }

        const { data: { session } } = result;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Identify existing session (async, don't block)
        if (session?.user) {
          setTimeout(() => {
            try {
              analytics.identify(session.user.id);
            } catch (error) {
              console.error("Analytics error:", error);
            }
          }, 0);
        }
      })
      .catch(async (error) => {
        console.error("Error getting session:", error);
        if (isInvalidRefreshTokenError(error)) {
          await recoverInvalidSession(error);
          return;
        }
        if (mounted) {
          setLoading(false);
        }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    
    // Track analytics asynchronously (don't block navigation)
    setTimeout(() => {
      try {
        analytics.track("User Sign Up Attempt", {
          success: !error,
          error_type: error?.message?.substring(0, 50),
        });
      } catch (err) {
        console.error("Analytics error:", err);
      }
    }, 0);
    
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
    
    // Track analytics asynchronously (don't block navigation)
    setTimeout(() => {
      try {
        analytics.track("User Sign In Attempt", {
          success: !error,
          error_type: error?.message?.substring(0, 50),
        });
      } catch (err) {
        console.error("Analytics error:", err);
      }
    }, 0);
    
    if (!error) {
      navigate("/");
    }
    
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) {
      toast.error(mc.toasts.errors.authGoogle);
      return { error };
    }
    return { error: null };
  };

  const sendOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      toast.error(mc.toasts.errors.authOtpSend);
      return { error };
    }
    return { error: null };
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      toast.error(mc.toasts.errors.authOtpInvalid);
      return { error };
    }
    return { error: null };
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
      
      // Clear canvas store - reset to initial state
      useCanvasStore.hydrate({
        projects: [],
        canvases: [],
        items: [],
        currentProjectId: null,
        currentCanvasId: null,
      });
      useCanvasStore.clearSelection();
      useCanvasStore.markClean();
      
      // Clear workspace store jobs and effects
      useWorkspaceStore.getState().clearPersistedJobs();
      useWorkspaceStore.getState().resetEffectsPreview();
      useWorkspaceStore.setState({ 
        jobs: [], 
        effectsPreviewStack: [],
        tabBadges: {},
      });
      
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
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, signInWithGoogle, sendOTP, verifyOTP, loading }}>
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
