import type {
  PostgrestError,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { InspireProject } from "@/types/inspire";
import type { Database } from "@/integrations/supabase/types";

export type InspireFilter = "all" | "featured" | "staff_pick";

const SELECT_COLUMNS = `
  id,
  share_token,
  view_count,
  like_count,
  bookmark_count,
  created_at,
  featured,
  staff_pick,
  is_inspire_approved,
  is_deleted,
  tags,
  user_id,
  asset:generated_assets (
    id,
    type,
    image_url,
    prompt,
    created_at
  ),
  profile:profiles!shared_assets_user_id_fkey (
    id,
    email,
    username
  )
`;

// Use main supabase client for public Inspire queries (no auth needed)
const inspireClient: SupabaseClient<Database> = supabase;

export const qualifiesForPublicInspire = (project: InspireProject | null | undefined) => {
  if (!project || project.is_deleted) {
    return false;
  }

  return Boolean(project.is_inspire_approved || project.featured || project.staff_pick);
};

export const matchesInspireFilter = (project: InspireProject, filter: InspireFilter) => {
  switch (filter) {
    case "featured":
      return Boolean(project.featured);
    case "staff_pick":
      return Boolean(project.staff_pick);
    default:
      return qualifiesForPublicInspire(project);
  }
};

export const sortInspireProjects = (projects: InspireProject[]) => {
  return [...projects].sort((a, b) => {
    const aFeatured = a.featured ? 1 : 0;
    const bFeatured = b.featured ? 1 : 0;
    if (aFeatured !== bFeatured) {
      return bFeatured - aFeatured;
    }

    const aStaff = a.staff_pick ? 1 : 0;
    const bStaff = b.staff_pick ? 1 : 0;
    if (aStaff !== bStaff) {
      return bStaff - aStaff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

interface FetchInspireOptions {
  filter?: InspireFilter;
  from?: number;
  to?: number;
  abortSignal?: AbortSignal;
}

export const fetchInspireProjects = async ({
  filter = "all",
  from = 0,
  to = 23,
  abortSignal,
}: FetchInspireOptions = {}) => {
  if (abortSignal?.aborted) {
    return { data: [], count: 0, error: null } as const;
  }

  try {
    let query = inspireClient
      .from("shared_assets")
      .select(SELECT_COLUMNS, { count: "exact" })
      .eq("is_deleted", false);

    if (filter === "featured") {
      query = query.eq("featured", true);
    } else if (filter === "staff_pick") {
      query = query.eq("staff_pick", true);
    } else {
      query = query.or("is_inspire_approved.eq.true,featured.eq.true,staff_pick.eq.true");
    }

    query = query
      .order("featured", { ascending: false, nullsFirst: false })
      .order("staff_pick", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[fetchInspireProjects] Database error:', {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      
      if (error.code === "PGRST301" || error.code === "42501") {
        return { data: [], count: 0, error: null } as const;
      }

      if (error.message?.toLowerCase().includes("jwt")) {
        return { data: [], count: 0, error: null } as const;
      }

      return { data: [], count: 0, error } as const;
    }

    const cleaned = (data ?? [])
      .filter((item) => {
        if (!item || !item.asset) return false;
        return qualifiesForPublicInspire(item as unknown as InspireProject);
      })
      .map((item) => item as unknown as InspireProject);

    return { data: sortInspireProjects(cleaned), count: count ?? cleaned.length, error: null } as const;
  } catch (error) {
    if (abortSignal?.aborted) {
      return { data: [], count: 0, error: null } as const;
    }

    return {
      data: [],
      count: 0,
      error: (error as PostgrestError) ?? null,
    } as const;
  }
};

export const fetchInspireProjectById = async (id: string) => {
  const { data, error } = await inspireClient
    .from("shared_assets")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST301" || error.code === "42501") {
      return null;
    }

    if (error.message?.toLowerCase().includes("jwt")) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const project = data as InspireProject;
  return qualifiesForPublicInspire(project) && project.asset ? project : null;
};

export const subscribeToInspireTable = (
  channelName: string,
  callback: (payload: RealtimePostgresChangesPayload<InspireProject>) => void
): RealtimeChannel => {
  return inspireClient
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table: "shared_assets" }, callback)
    .subscribe();
};

export const detachRealtimeChannel = (channel: RealtimeChannel | null | undefined) => {
  if (channel) {
    inspireClient.removeChannel(channel);
  }
};

