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
      // Check if user has access via invite code
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
            toast.error("Invalid or expired invite code");
            navigate("/");
            return;
          }

          // Store the invite code in session
          sessionStorage.setItem("invite_code", inviteCode);
          setHasAccess(true);
          setVerifying(false);
          
          // If user is logged in, mark invite as used
          if (user) {
            await supabase
              .from("beta_invites")
              .update({ used_at: new Date().toISOString() })
              .eq("code", inviteCode);
          }
        } catch (error) {
          console.error("Error verifying invite:", error);
          toast.error("Failed to verify access");
          navigate("/");
        }
      } else {
        // No invite code, redirect to beta landing
        toast.error("You need an invite to access the studio");
        navigate("/");
      }
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
