import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/LoadingState";
import { toast } from "sonner";

export const ProtectedStudio = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      // If user is authenticated, they have access (existing users)
      if (user) {
        setHasAccess(true);
        setVerifying(false);
        return;
      }

      // If not authenticated, check for invite code
      const inviteCode = searchParams.get("invite") || sessionStorage.getItem("invite_code");
      
      if (inviteCode) {
        try {
          // Verify the invite code
          const { data, error } = await supabase
            .from("beta_invites")
            .select("*")
            .eq("code", inviteCode)
            .is("used_at", null)
            .gt("expires_at", new Date().toISOString())
            .single();

          if (error || !data) {
            toast.error("Invalid or expired invite code. Please sign in if you already have an account.");
            navigate("/");
            return;
          }

          // Store the invite code in session for when they sign up
          sessionStorage.setItem("invite_code", inviteCode);
          
          // Redirect to auth page to sign up/sign in
          toast.info("Please sign in or create an account to continue");
          navigate("/auth");
        } catch (error) {
          console.error("Error verifying invite:", error);
          toast.error("Failed to verify access");
          navigate("/");
        }
      } else {
        // No user and no invite code - redirect to beta landing
        navigate("/");
      }
      
      setVerifying(false);
    };

    if (!loading) {
      verifyAccess();
    }
  }, [user, loading, navigate, searchParams]);

  if (loading || verifying) {
    return <LoadingState />;
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
