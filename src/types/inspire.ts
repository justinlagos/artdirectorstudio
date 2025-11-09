export interface InspireProjectAsset {
  id: string;
  type: "analysis" | "image" | "prompt";
  image_url: string | null;
  prompt: string | null;
  created_at: string;
}

export interface InspireProjectProfile {
  id: string;
  email?: string | null;
  username?: string | null;
}

export interface InspireProjectTags {
  style?: string[];
  color?: string[];
  mood?: string[];
  composition?: string[];
  [key: string]: string[] | undefined;
}

export interface InspireProject {
  id: string;
  share_token: string;
  view_count: number;
  like_count: number | null;
  bookmark_count: number | null;
  created_at: string;
  featured: boolean | null;
  staff_pick: boolean | null;
  is_inspire_approved?: boolean | null;
  is_public?: boolean | null;
  is_deleted?: boolean | null;
  tags: InspireProjectTags | null | Record<string, any>;
  user_id: string;
  asset: InspireProjectAsset | null;
  profile?: InspireProjectProfile | null;
}
