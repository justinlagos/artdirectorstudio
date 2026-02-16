import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_ROLE_STRINGS = new Set(["admin", "owner", "super_admin", "superadmin"]);

const roleContainsAdmin = (value: unknown): boolean => {
  if (typeof value === "string") {
    return ADMIN_ROLE_STRINGS.has(value.trim().toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && ADMIN_ROLE_STRINGS.has(item.trim().toLowerCase()));
  }
  return false;
};

const hasAdminClaim = (user: User): boolean => {
  const appMeta = user?.app_metadata ?? {};
  const userMeta = user?.user_metadata ?? {};

  if (appMeta?.is_admin === true || userMeta?.is_admin === true) {
    return true;
  }

  return (
    roleContainsAdmin(appMeta?.role) ||
    roleContainsAdmin(userMeta?.role) ||
    roleContainsAdmin(appMeta?.roles) ||
    roleContainsAdmin(userMeta?.roles) ||
    roleContainsAdmin(appMeta?.app_role) ||
    roleContainsAdmin(userMeta?.app_role)
  );
};

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

      if (hasAdminClaim(user)) {
        setIsAdmin(true);
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

        if (data) {
          setIsAdmin(true);
          return;
        }

        // Fallback to server-side admin resolution (handles role table issues).
        const { data: accessData, error: accessError } = await supabase.functions.invoke(
          "check-feature-access",
          { body: { action: "analyze" } }
        );

        if (error) {
          console.error("Error checking admin status via user_roles:", error);
        }

        if (accessError) {
          console.error("Error checking admin status via check-feature-access:", accessError);
          setIsAdmin(false);
        } else {
          setIsAdmin(accessData?.allowed === true && accessData?.tier === "admin");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
