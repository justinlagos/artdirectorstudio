import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";

const ADMIN_ROLE_STRINGS = new Set(["admin", "owner", "super_admin", "superadmin"]);

function parseCsv(value: string | undefined, normalizeToLower = false): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => (normalizeToLower ? entry.toLowerCase() : entry))
  );
}

function roleValueContainsAdmin(value: unknown): boolean {
  if (typeof value === "string") {
    return ADMIN_ROLE_STRINGS.has(value.trim().toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && ADMIN_ROLE_STRINGS.has(item.trim().toLowerCase()));
  }
  return false;
}

function hasAdminClaims(user: User): boolean {
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;

  if (appMeta.is_admin === true || userMeta.is_admin === true) {
    return true;
  }

  return (
    roleValueContainsAdmin(appMeta.role) ||
    roleValueContainsAdmin(userMeta.role) ||
    roleValueContainsAdmin(appMeta.roles) ||
    roleValueContainsAdmin(userMeta.roles) ||
    roleValueContainsAdmin(appMeta.app_role) ||
    roleValueContainsAdmin(userMeta.app_role)
  );
}

async function isFirstProfileUser(supabaseClient: SupabaseClient<any, any, any>, userId: string): Promise<boolean> {
  const { data: firstProfileByCreatedAt, error: firstByCreatedAtError } = await supabaseClient
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstByCreatedAtError) {
    return firstProfileByCreatedAt?.id === userId;
  }

  const { data: firstProfileById, error: firstByIdError } = await supabaseClient
    .from("profiles")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstByIdError) {
    return false;
  }

  return firstProfileById?.id === userId;
}

export async function resolveAdminAccess(
  supabaseClient: SupabaseClient<any, any, any>,
  user: User,
  context: string
): Promise<{ isAdmin: boolean; source: string }> {
  const adminUserIds = parseCsv(Deno.env.get("ADMIN_USER_IDS"));
  if (adminUserIds.has(user.id)) {
    return { isAdmin: true, source: "env_admin_user_ids" };
  }

  const adminEmails = parseCsv(Deno.env.get("ADMIN_EMAILS"), true);
  const email = (user.email ?? "").trim().toLowerCase();
  if (email && adminEmails.has(email)) {
    return { isAdmin: true, source: "env_admin_emails" };
  }

  if (hasAdminClaims(user)) {
    return { isAdmin: true, source: "jwt_claims" };
  }

  const { data: adminRole, error: roleError } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error(`${context}: Failed to check user_roles:`, roleError);
  } else if (adminRole) {
    return { isAdmin: true, source: "user_roles_table" };
  }

  const firstProfileFallback = await isFirstProfileUser(supabaseClient, user.id);
  if (firstProfileFallback) {
    return { isAdmin: true, source: "first_profile_fallback" };
  }

  return { isAdmin: false, source: "none" };
}
