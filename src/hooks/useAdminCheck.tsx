import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn("Admin check timeout - defaulting to non-admin");
        setIsAdmin(false);
        setLoading(false);
      }, 5000); // 5 second timeout

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        clearTimeout(timeoutId);
        
        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
        setIsAdmin(!!data);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
