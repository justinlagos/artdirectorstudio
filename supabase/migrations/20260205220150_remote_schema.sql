


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."asset_type" AS ENUM (
    'analysis',
    'image',
    'prompt'
);


ALTER TYPE "public"."asset_type" OWNER TO "postgres";


CREATE TYPE "public"."credit_action" AS ENUM (
    'analyze',
    'generate',
    'refine',
    'blend',
    'upscale'
);


ALTER TYPE "public"."credit_action" OWNER TO "postgres";


CREATE TYPE "public"."credit_provider" AS ENUM (
    'lovable',
    'openai',
    'replicate',
    'gemini'
);


ALTER TYPE "public"."credit_provider" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update the user's credit balance
  UPDATE public.credits
  SET balance = balance + amount,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- If no record exists, create one (safety check)
  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, balance, updated_at)
    VALUES (target_user_id, GREATEST(amount, 0), NOW());
  END IF;

  -- Log the transaction with NULL action/provider for admin adjustments
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    action,
    provider,
    description,
    notes,
    timestamp
  ) VALUES (
    target_user_id,
    amount,
    NULL,  -- NULL for admin adjustments
    NULL,  -- NULL for admin adjustments
    COALESCE(description_text, 
      CASE 
        WHEN amount > 0 THEN 'Admin credit adjustment (added)'
        ELSE 'Admin credit adjustment (deducted)'
      END
    ),
    'Manual adjustment by administrator',
    NOW()
  );
END;
$$;


ALTER FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text") IS 'Allows administrators to manually adjust user credit balances. Amount can be positive (add credits) or negative (deduct credits). Action and provider are set to NULL for admin adjustments.';



CREATE OR REPLACE FUNCTION "public"."cleanup_deleted_assets"("days_old" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM generated_assets
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_deleted_assets"("days_old" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_context"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM artie_context_memory
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_community_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.community_posts
    set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;


ALTER FUNCTION "public"."decrement_community_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_community_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.community_posts
    set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;


ALTER FUNCTION "public"."decrement_community_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_share_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.share_slug IS NULL THEN
    NEW.share_slug := encode(gen_random_bytes(8), 'base64')::text;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_share_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("p_user" "uuid", "p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT public.has_role(p_user, p_role);
$$;


ALTER FUNCTION "public"."has_role"("p_user" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_community_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.community_posts
    set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."increment_community_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_community_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.community_posts
    set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."increment_community_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_community_post_view"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.community_posts
    SET views_count = views_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_community_post_view"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_image_cache_access"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.access_count = OLD.access_count + 1;
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_image_cache_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_asset"("asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE generated_assets
  SET deleted_at = NOW()
  WHERE id = asset_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."soft_delete_asset"("asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid" DEFAULT NULL::"uuid", "p_session_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if view already exists in last 24 hours
  SELECT EXISTS(
    SELECT 1 FROM public.community_views
    WHERE post_id = p_post_id
      AND (
        (p_viewer_id IS NOT NULL AND viewer_id = p_viewer_id)
        OR (p_session_id IS NOT NULL AND session_id = p_session_id)
      )
      AND created_at > NOW() - INTERVAL '24 hours'
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    INSERT INTO public.community_views (post_id, viewer_id, session_id)
    VALUES (p_post_id, p_viewer_id, p_session_id);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid", "p_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid", "p_session_id" "text") IS 'Track unique views with 24-hour debounce per session';



CREATE OR REPLACE FUNCTION "public"."undelete_asset"("asset_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE generated_assets
  SET deleted_at = NULL
  WHERE id = asset_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."undelete_asset"("asset_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_community_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_community_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_preset_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.custom_generation_presets
    SET like_count = like_count + 1
    WHERE id = NEW.preset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.custom_generation_presets
    SET like_count = like_count - 1
    WHERE id = OLD.preset_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_preset_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."artie_context_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "context_type" "text" NOT NULL,
    "context_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "artie_context_memory_context_type_check" CHECK (("context_type" = ANY (ARRAY['image'::"text", 'brief'::"text", 'preference'::"text", 'workflow'::"text"])))
);


ALTER TABLE "public"."artie_context_memory" OWNER TO "postgres";


COMMENT ON TABLE "public"."artie_context_memory" IS 'Context memory for Artie (images, briefs, preferences, workflow)';



COMMENT ON COLUMN "public"."artie_context_memory"."expires_at" IS 'Optional expiry for temporary context (e.g., workflow steps)';



CREATE TABLE IF NOT EXISTS "public"."artie_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."artie_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."artie_conversations" IS 'Persistent Artie conversation threads';



CREATE TABLE IF NOT EXISTS "public"."artie_image_analysis_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_url" "text" NOT NULL,
    "analysis" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artie_image_analysis_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."artie_image_analysis_cache" IS 'Cache for image analysis to avoid re-processing';



CREATE TABLE IF NOT EXISTS "public"."artie_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "tool_calls" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "artie_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."artie_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."artie_messages" IS 'Individual messages within Artie conversations';



CREATE TABLE IF NOT EXISTS "public"."artie_user_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "interaction_type" "text" NOT NULL,
    "interaction_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "include_in_training" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "artie_user_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['message'::"text", 'tool_use'::"text", 'feedback'::"text", 'workflow'::"text"])))
);


ALTER TABLE "public"."artie_user_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."artie_user_interactions" IS 'User interactions for training data collection';



COMMENT ON COLUMN "public"."artie_user_interactions"."include_in_training" IS 'Privacy flag: users can opt-out of training data collection';



CREATE TABLE IF NOT EXISTS "public"."asset_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shared_asset_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asset_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shared_asset_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asset_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "community_follows_no_self_follow" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."community_follows" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_follows" IS 'User-to-user follow relationships';



CREATE TABLE IF NOT EXISTS "public"."community_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "likes_count" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "prompt" "text",
    "context_prompt" "text",
    "tool_used" "text",
    "params" "jsonb",
    "aspect_ratio" "text",
    "model_version" "text" DEFAULT 'google/gemini-3-pro-image-preview'::"text",
    "remix_source_id" "uuid",
    "original_author_id" "uuid",
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "is_featured" boolean DEFAULT false,
    "is_staff_pick" boolean DEFAULT false,
    "rejected_reason" "text",
    "views_count" integer DEFAULT 0,
    "shares_count" integer DEFAULT 0,
    "thumbnail_url" "text",
    "tags" "text"[],
    "style" "text",
    "mood" "text",
    "color_palette" "text",
    "is_approved" boolean DEFAULT false,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "featured_at" timestamp with time zone,
    CONSTRAINT "community_posts_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "community_posts_tool_used_check" CHECK (("tool_used" = ANY (ARRAY['studio'::"text", 'edit'::"text", 'blend'::"text", 'upscale'::"text", 'artie'::"text"])))
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."community_posts"."prompt" IS 'Original prompt used to generate the image';



COMMENT ON COLUMN "public"."community_posts"."tool_used" IS 'Tool used to create the image: studio, edit, blend, upscale, or artie';



COMMENT ON COLUMN "public"."community_posts"."remix_source_id" IS 'ID of the original post if this is a remix';



COMMENT ON COLUMN "public"."community_posts"."is_featured" IS 'Admin-curated featured content for landing page';



COMMENT ON COLUMN "public"."community_posts"."is_staff_pick" IS 'Admin-selected exceptional work';



CREATE TABLE IF NOT EXISTS "public"."community_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "reporter_id" "uuid",
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    CONSTRAINT "community_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."community_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_reports" IS 'User reports for content moderation';



CREATE TABLE IF NOT EXISTS "public"."community_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "viewer_id" "uuid",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_views" IS 'View tracking for analytics (debounced by session)';



CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "public"."credit_action",
    "provider" "public"."credit_provider",
    "amount" integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "asset_id" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_generation_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT '✨'::"text",
    "category" "text" DEFAULT 'custom'::"text" NOT NULL,
    "options" "jsonb" DEFAULT '{"size": "1024x1024", "quality": "auto", "background": "auto"}'::"jsonb" NOT NULL,
    "prompt_modifier" "text" NOT NULL,
    "is_public" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "like_count" integer DEFAULT 0
);


ALTER TABLE "public"."custom_generation_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generated_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."asset_type" NOT NULL,
    "prompt" "text",
    "image_url" "text",
    "analysis_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text",
    "source_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "params" "jsonb" DEFAULT '{}'::"jsonb",
    "duration_ms" integer,
    "share_slug" "text",
    "thumbnail_url" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "generated_assets_action_check" CHECK (("action" = ANY (ARRAY['analyze'::"text", 'blend'::"text", 'upscale'::"text", 'generate'::"text", 'batch'::"text"])))
);


ALTER TABLE "public"."generated_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idempotency_cache" (
    "key" "text" NOT NULL,
    "response" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."idempotency_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "page_path" "text" NOT NULL,
    "page_title" "text",
    "referrer" "text",
    "user_agent" "text",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "screen_resolution" "text",
    "country" "text",
    "city" "text",
    "time_on_page" integer,
    "is_bounce" boolean DEFAULT false,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text"
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preset_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preset_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preset_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ui_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "subscription_tier" "text",
    "subscription_status" "text",
    "subscription_provider" "text",
    "subscription_expires_at" timestamp with time zone,
    "free_credits" integer DEFAULT 0 NOT NULL,
    "daily_limit" integer DEFAULT 0 NOT NULL,
    "daily_usage" integer DEFAULT 0 NOT NULL,
    "daily_usage_reset_at" timestamp with time zone,
    "plan_id" "text",
    "customer_id" "text",
    CONSTRAINT "profiles_free_credits_nonneg" CHECK (("free_credits" >= 0))
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."ui_preferences" IS 'User UI preferences including workspace mode, keyboard shortcuts, experimental features, and generation defaults';



CREATE TABLE IF NOT EXISTS "public"."shared_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid",
    "user_id" "uuid",
    "title" "text",
    "description" "text",
    "image_url" "text",
    "thumbnail_url" "text",
    "share_token" "text",
    "share_slug" "text",
    "is_public" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "staff_pick" boolean DEFAULT false NOT NULL,
    "is_inspire_approved" boolean DEFAULT false NOT NULL,
    "style" "text",
    "color_palette" "text",
    "mood" "text",
    "composition" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shared_assets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."artie_context_memory"
    ADD CONSTRAINT "artie_context_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artie_conversations"
    ADD CONSTRAINT "artie_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artie_image_analysis_cache"
    ADD CONSTRAINT "artie_image_analysis_cache_image_url_key" UNIQUE ("image_url");



ALTER TABLE ONLY "public"."artie_image_analysis_cache"
    ADD CONSTRAINT "artie_image_analysis_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artie_messages"
    ADD CONSTRAINT "artie_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artie_user_interactions"
    ADD CONSTRAINT "artie_user_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_bookmarks"
    ADD CONSTRAINT "asset_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_bookmarks"
    ADD CONSTRAINT "asset_bookmarks_user_id_shared_asset_id_key" UNIQUE ("user_id", "shared_asset_id");



ALTER TABLE ONLY "public"."asset_likes"
    ADD CONSTRAINT "asset_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_likes"
    ADD CONSTRAINT "asset_likes_user_id_shared_asset_id_key" UNIQUE ("user_id", "shared_asset_id");



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_follows"
    ADD CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_follows"
    ADD CONSTRAINT "community_follows_unique" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."community_likes"
    ADD CONSTRAINT "community_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_likes"
    ADD CONSTRAINT "community_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_reports"
    ADD CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_views"
    ADD CONSTRAINT "community_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_generation_presets"
    ADD CONSTRAINT "custom_generation_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_assets"
    ADD CONSTRAINT "generated_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_assets"
    ADD CONSTRAINT "generated_assets_share_slug_key" UNIQUE ("share_slug");



ALTER TABLE ONLY "public"."idempotency_cache"
    ADD CONSTRAINT "idempotency_cache_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preset_likes"
    ADD CONSTRAINT "preset_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preset_likes"
    ADD CONSTRAINT "preset_likes_user_id_preset_id_key" UNIQUE ("user_id", "preset_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_assets"
    ADD CONSTRAINT "shared_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_assets"
    ADD CONSTRAINT "shared_assets_share_slug_key" UNIQUE ("share_slug");



ALTER TABLE ONLY "public"."shared_assets"
    ADD CONSTRAINT "shared_assets_share_token_key" UNIQUE ("share_token");



CREATE INDEX "community_comments_post_idx" ON "public"."community_comments" USING "btree" ("post_id", "created_at" DESC);



CREATE INDEX "community_likes_post_idx" ON "public"."community_likes" USING "btree" ("post_id");



CREATE INDEX "community_posts_approved_idx" ON "public"."community_posts" USING "btree" ("is_approved", "is_featured", "likes_count" DESC);



CREATE INDEX "community_posts_created_idx" ON "public"."community_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "community_posts_featured_at_idx" ON "public"."community_posts" USING "btree" ("featured_at" DESC) WHERE ("is_featured" = true);



CREATE INDEX "community_posts_pending_idx" ON "public"."community_posts" USING "btree" ("created_at" DESC) WHERE ("is_approved" = false);



CREATE INDEX "community_posts_popularity_idx" ON "public"."community_posts" USING "btree" ("likes_count" DESC, "comments_count" DESC);



CREATE INDEX "idx_artie_context_conversation" ON "public"."artie_context_memory" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_artie_context_expiry" ON "public"."artie_context_memory" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_artie_context_user" ON "public"."artie_context_memory" USING "btree" ("user_id", "context_type", "created_at" DESC);



CREATE INDEX "idx_artie_conversations_user" ON "public"."artie_conversations" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_artie_image_cache_cleanup" ON "public"."artie_image_analysis_cache" USING "btree" ("last_accessed_at", "access_count");



CREATE INDEX "idx_artie_image_cache_url" ON "public"."artie_image_analysis_cache" USING "btree" ("image_url");



CREATE INDEX "idx_artie_interactions_training" ON "public"."artie_user_interactions" USING "btree" ("include_in_training", "created_at" DESC) WHERE ("include_in_training" = true);



CREATE INDEX "idx_artie_interactions_type" ON "public"."artie_user_interactions" USING "btree" ("interaction_type", "created_at" DESC);



CREATE INDEX "idx_artie_interactions_user" ON "public"."artie_user_interactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_artie_messages_conversation" ON "public"."artie_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_community_comments_post_id" ON "public"."community_comments" USING "btree" ("post_id");



CREATE INDEX "idx_community_follows_follower" ON "public"."community_follows" USING "btree" ("follower_id");



CREATE INDEX "idx_community_follows_following" ON "public"."community_follows" USING "btree" ("following_id");



CREATE INDEX "idx_community_likes_post_id" ON "public"."community_likes" USING "btree" ("post_id");



CREATE INDEX "idx_community_likes_user_post" ON "public"."community_likes" USING "btree" ("user_id", "post_id");



CREATE INDEX "idx_community_posts_created_at" ON "public"."community_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_community_posts_featured" ON "public"."community_posts" USING "btree" ("is_featured", "created_at" DESC) WHERE ("is_featured" = true);



CREATE INDEX "idx_community_posts_moderation" ON "public"."community_posts" USING "btree" ("moderation_status", "created_at" DESC);



CREATE INDEX "idx_community_posts_remix_source" ON "public"."community_posts" USING "btree" ("remix_source_id") WHERE ("remix_source_id" IS NOT NULL);



CREATE INDEX "idx_community_posts_staff_pick" ON "public"."community_posts" USING "btree" ("is_staff_pick", "created_at" DESC) WHERE ("is_staff_pick" = true);



CREATE INDEX "idx_community_posts_tool_used" ON "public"."community_posts" USING "btree" ("tool_used") WHERE ("tool_used" IS NOT NULL);



CREATE INDEX "idx_community_posts_user_id" ON "public"."community_posts" USING "btree" ("user_id");



CREATE INDEX "idx_community_posts_views" ON "public"."community_posts" USING "btree" ("views_count" DESC);



CREATE INDEX "idx_community_reports_post" ON "public"."community_reports" USING "btree" ("post_id");



CREATE INDEX "idx_community_reports_status" ON "public"."community_reports" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_community_views_post" ON "public"."community_views" USING "btree" ("post_id", "created_at" DESC);



CREATE INDEX "idx_community_views_viewer" ON "public"."community_views" USING "btree" ("viewer_id") WHERE ("viewer_id" IS NOT NULL);



CREATE INDEX "idx_credit_transactions_user_timestamp" ON "public"."credit_transactions" USING "btree" ("user_id", "timestamp" DESC);



CREATE INDEX "idx_custom_presets_public" ON "public"."custom_generation_presets" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_custom_presets_user_id" ON "public"."custom_generation_presets" USING "btree" ("user_id");



CREATE INDEX "idx_generated_assets_action" ON "public"."generated_assets" USING "btree" ("action");



CREATE INDEX "idx_generated_assets_deleted" ON "public"."generated_assets" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_generated_assets_prompt_fts" ON "public"."generated_assets" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("prompt", ''::"text")));



CREATE INDEX "idx_generated_assets_share_slug" ON "public"."generated_assets" USING "btree" ("share_slug");



CREATE INDEX "idx_generated_assets_type_action" ON "public"."generated_assets" USING "btree" ("type", "action") WHERE ("type" = 'image'::"public"."asset_type");



CREATE INDEX "idx_generated_assets_user_created" ON "public"."generated_assets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_idempotency_expires" ON "public"."idempotency_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_page_views_created_at" ON "public"."page_views" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_page_views_page_path" ON "public"."page_views" USING "btree" ("page_path");



CREATE INDEX "idx_page_views_session_id" ON "public"."page_views" USING "btree" ("session_id");



CREATE INDEX "idx_page_views_user_id" ON "public"."page_views" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_tier_credits" ON "public"."profiles" USING "btree" ("subscription_tier", "free_credits") WHERE ("subscription_tier" IS NOT NULL);



CREATE INDEX "idx_profiles_ui_preferences" ON "public"."profiles" USING "gin" ("ui_preferences");



CREATE INDEX "idx_shared_assets_featured" ON "public"."shared_assets" USING "btree" ("featured", "created_at" DESC) WHERE ("featured" = true);



CREATE INDEX "idx_shared_assets_inspire" ON "public"."shared_assets" USING "btree" ("is_inspire_approved", "created_at" DESC) WHERE (("is_inspire_approved" = true) AND ("is_deleted" = false));



CREATE INDEX "idx_shared_assets_public" ON "public"."shared_assets" USING "btree" ("is_public", "created_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_shared_assets_share_token" ON "public"."shared_assets" USING "btree" ("share_token");



CREATE INDEX "idx_shared_assets_user_created" ON "public"."shared_assets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "inspire_approved_idx" ON "public"."shared_assets" USING "btree" ("is_inspire_approved", "created_at" DESC);



CREATE INDEX "inspire_featured_idx" ON "public"."shared_assets" USING "btree" ("featured" DESC, "created_at" DESC);



CREATE INDEX "inspire_staff_idx" ON "public"."shared_assets" USING "btree" ("staff_pick" DESC, "created_at" DESC);



CREATE OR REPLACE TRIGGER "community_comment_delete" AFTER DELETE ON "public"."community_comments" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_community_comment_count"();



CREATE OR REPLACE TRIGGER "community_comment_insert" AFTER INSERT ON "public"."community_comments" FOR EACH ROW EXECUTE FUNCTION "public"."increment_community_comment_count"();



CREATE OR REPLACE TRIGGER "community_like_delete" AFTER DELETE ON "public"."community_likes" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_community_like_count"();



CREATE OR REPLACE TRIGGER "community_like_insert" AFTER INSERT ON "public"."community_likes" FOR EACH ROW EXECUTE FUNCTION "public"."increment_community_like_count"();



CREATE OR REPLACE TRIGGER "community_view_insert" AFTER INSERT ON "public"."community_views" FOR EACH ROW EXECUTE FUNCTION "public"."increment_community_post_view"();



CREATE OR REPLACE TRIGGER "on_community_comment_change" AFTER INSERT OR DELETE ON "public"."community_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_comments_count"();



CREATE OR REPLACE TRIGGER "on_community_like_change" AFTER INSERT OR DELETE ON "public"."community_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_likes_count"();



CREATE OR REPLACE TRIGGER "set_share_slug" BEFORE INSERT ON "public"."generated_assets" FOR EACH ROW EXECUTE FUNCTION "public"."generate_share_slug"();



CREATE OR REPLACE TRIGGER "track_image_cache_access" BEFORE UPDATE ON "public"."artie_image_analysis_cache" FOR EACH ROW WHEN ((NOT ("old"."analysis" IS DISTINCT FROM "new"."analysis"))) EXECUTE FUNCTION "public"."increment_image_cache_access"();



CREATE OR REPLACE TRIGGER "update_artie_conversations_updated_at" BEFORE UPDATE ON "public"."artie_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_artie_image_cache_updated_at" BEFORE UPDATE ON "public"."artie_image_analysis_cache" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_custom_presets_updated_at" BEFORE UPDATE ON "public"."custom_generation_presets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_preset_like_count_trigger" AFTER INSERT OR DELETE ON "public"."preset_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_preset_like_count"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shared_assets_updated_at" BEFORE UPDATE ON "public"."shared_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."artie_context_memory"
    ADD CONSTRAINT "artie_context_memory_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."artie_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artie_context_memory"
    ADD CONSTRAINT "artie_context_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artie_conversations"
    ADD CONSTRAINT "artie_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artie_messages"
    ADD CONSTRAINT "artie_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."artie_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artie_user_interactions"
    ADD CONSTRAINT "artie_user_interactions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."artie_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artie_user_interactions"
    ADD CONSTRAINT "artie_user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_bookmarks"
    ADD CONSTRAINT "asset_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_likes"
    ADD CONSTRAINT "asset_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_follows"
    ADD CONSTRAINT "community_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_follows"
    ADD CONSTRAINT "community_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_likes"
    ADD CONSTRAINT "community_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_likes"
    ADD CONSTRAINT "community_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_original_author_id_fkey" FOREIGN KEY ("original_author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_remix_source_id_fkey" FOREIGN KEY ("remix_source_id") REFERENCES "public"."community_posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_reports"
    ADD CONSTRAINT "community_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_reports"
    ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_views"
    ADD CONSTRAINT "community_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_views"
    ADD CONSTRAINT "community_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_generation_presets"
    ADD CONSTRAINT "custom_generation_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_assets"
    ADD CONSTRAINT "generated_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."preset_likes"
    ADD CONSTRAINT "preset_likes_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."custom_generation_presets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preset_likes"
    ADD CONSTRAINT "preset_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_assets"
    ADD CONSTRAINT "shared_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."generated_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shared_assets"
    ADD CONSTRAINT "shared_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all page views" ON "public"."page_views" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Allow updating own session page views" ON "public"."page_views" FOR UPDATE USING (("created_at" > ("now"() - '01:00:00'::interval)));



CREATE POLICY "Anyone can read image analysis cache" ON "public"."artie_image_analysis_cache" FOR SELECT USING (true);



CREATE POLICY "Anyone can track page views" ON "public"."page_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view comments" ON "public"."community_comments" FOR SELECT USING (true);



CREATE POLICY "Anyone can view likes" ON "public"."community_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view posts" ON "public"."community_posts" FOR SELECT USING (true);



CREATE POLICY "Authenticated comment" ON "public"."community_comments" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Authenticated create community posts" ON "public"."community_posts" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Authenticated like" ON "public"."community_likes" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Authenticated unlike own" ON "public"."community_likes" FOR DELETE USING ((("auth"."role"() = 'authenticated'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Authenticated users can create comments" ON "public"."community_comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create likes" ON "public"."community_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create posts" ON "public"."community_posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public insert views" ON "public"."community_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public read community comments" ON "public"."community_comments" FOR SELECT USING (true);



CREATE POLICY "Public read community likes" ON "public"."community_likes" FOR SELECT USING (true);



CREATE POLICY "Public read community posts" ON "public"."community_posts" FOR SELECT USING (true);



CREATE POLICY "Public read follows" ON "public"."community_follows" FOR SELECT USING (true);



CREATE POLICY "Public read for Inspire" ON "public"."shared_assets" FOR SELECT TO "authenticated", "anon" USING (((COALESCE("is_deleted", false) = false) AND ((COALESCE("is_inspire_approved", false) = true) OR (COALESCE("featured", false) = true) OR (COALESCE("staff_pick", false) = true))));



CREATE POLICY "Service role can manage idempotency cache" ON "public"."idempotency_cache" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage image analysis cache" ON "public"."artie_image_analysis_cache" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create their context" ON "public"."artie_context_memory" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their interactions" ON "public"."artie_user_interactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their messages" ON "public"."artie_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."artie_conversations"
  WHERE (("artie_conversations"."id" = "artie_messages"."conversation_id") AND ("artie_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own conversations" ON "public"."artie_conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own preset likes" ON "public"."preset_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own presets" ON "public"."custom_generation_presets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own posts" ON "public"."community_posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their context" ON "public"."artie_context_memory" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their interactions" ON "public"."artie_user_interactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their messages" ON "public"."artie_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."artie_conversations"
  WHERE (("artie_conversations"."id" = "artie_messages"."conversation_id") AND ("artie_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own assets" ON "public"."generated_assets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."community_comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own conversations" ON "public"."artie_conversations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own generated assets" ON "public"."generated_assets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."community_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own posts" ON "public"."community_posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own preset likes" ON "public"."preset_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own presets" ON "public"."custom_generation_presets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow" ON "public"."community_follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert their own assets" ON "public"."generated_assets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own generated assets" ON "public"."generated_assets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can report posts" ON "public"."community_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can unfollow" ON "public"."community_follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can update own posts" ON "public"."community_posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their context" ON "public"."artie_context_memory" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their interactions" ON "public"."artie_user_interactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their messages" ON "public"."artie_messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."artie_conversations"
  WHERE (("artie_conversations"."id" = "artie_messages"."conversation_id") AND ("artie_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own conversations" ON "public"."artie_conversations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own generated assets" ON "public"."generated_assets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own posts" ON "public"."community_posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own presets" ON "public"."custom_generation_presets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all preset likes" ON "public"."preset_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view own assets" ON "public"."generated_assets" FOR SELECT USING ((("auth"."uid"() = "user_id") AND (("deleted_at" IS NULL) OR ("deleted_at" > "now"()))));



CREATE POLICY "Users can view public presets" ON "public"."custom_generation_presets" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Users can view their context" ON "public"."artie_context_memory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their interactions" ON "public"."artie_user_interactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their messages" ON "public"."artie_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."artie_conversations"
  WHERE (("artie_conversations"."id" = "artie_messages"."conversation_id") AND ("artie_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own assets" ON "public"."generated_assets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own conversations" ON "public"."artie_conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own generated assets" ON "public"."generated_assets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own presets" ON "public"."custom_generation_presets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own transactions" ON "public"."credit_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."artie_context_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artie_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artie_image_analysis_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artie_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artie_user_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_generation_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generated_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."idempotency_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preset_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "public_inspire_read" ON "public"."shared_assets" FOR SELECT USING ((("is_deleted" = false) AND (("is_inspire_approved" = true) OR ("featured" = true) OR ("staff_pick" = true))));



CREATE POLICY "public_read_inspire_assets" ON "public"."generated_assets" FOR SELECT USING (true);



CREATE POLICY "public_shared_assets_read" ON "public"."generated_assets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."shared_assets"
  WHERE (("shared_assets"."asset_id" = "generated_assets"."id") AND ("shared_assets"."is_deleted" = false) AND (("shared_assets"."is_inspire_approved" = true) OR ("shared_assets"."featured" = true) OR ("shared_assets"."staff_pick" = true))))));



ALTER TABLE "public"."shared_assets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_user_credits"("target_user_id" "uuid", "amount" integer, "description_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_deleted_assets"("days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_deleted_assets"("days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_deleted_assets"("days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_community_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_community_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_community_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_community_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_community_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_community_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_share_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_share_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_share_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("p_user" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("p_user" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("p_user" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_community_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_community_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_community_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_community_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_community_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_community_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_community_post_view"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_community_post_view"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_community_post_view"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_image_cache_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_image_cache_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_image_cache_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_asset"("asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_asset"("asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_asset"("asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid", "p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_community_post_view"("p_post_id" "uuid", "p_viewer_id" "uuid", "p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."undelete_asset"("asset_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."undelete_asset"("asset_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."undelete_asset"("asset_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_preset_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_preset_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_preset_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."artie_context_memory" TO "anon";
GRANT ALL ON TABLE "public"."artie_context_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."artie_context_memory" TO "service_role";



GRANT ALL ON TABLE "public"."artie_conversations" TO "anon";
GRANT ALL ON TABLE "public"."artie_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."artie_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."artie_image_analysis_cache" TO "anon";
GRANT ALL ON TABLE "public"."artie_image_analysis_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."artie_image_analysis_cache" TO "service_role";



GRANT ALL ON TABLE "public"."artie_messages" TO "anon";
GRANT ALL ON TABLE "public"."artie_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."artie_messages" TO "service_role";



GRANT ALL ON TABLE "public"."artie_user_interactions" TO "anon";
GRANT ALL ON TABLE "public"."artie_user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."artie_user_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."asset_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."asset_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."asset_likes" TO "anon";
GRANT ALL ON TABLE "public"."asset_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_likes" TO "service_role";



GRANT ALL ON TABLE "public"."community_comments" TO "anon";
GRANT ALL ON TABLE "public"."community_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."community_comments" TO "service_role";



GRANT ALL ON TABLE "public"."community_follows" TO "anon";
GRANT ALL ON TABLE "public"."community_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."community_follows" TO "service_role";



GRANT ALL ON TABLE "public"."community_likes" TO "anon";
GRANT ALL ON TABLE "public"."community_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."community_likes" TO "service_role";



GRANT ALL ON TABLE "public"."community_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_posts" TO "service_role";



GRANT ALL ON TABLE "public"."community_reports" TO "anon";
GRANT ALL ON TABLE "public"."community_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."community_reports" TO "service_role";



GRANT ALL ON TABLE "public"."community_views" TO "anon";
GRANT ALL ON TABLE "public"."community_views" TO "authenticated";
GRANT ALL ON TABLE "public"."community_views" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."custom_generation_presets" TO "anon";
GRANT ALL ON TABLE "public"."custom_generation_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_generation_presets" TO "service_role";



GRANT ALL ON TABLE "public"."generated_assets" TO "anon";
GRANT ALL ON TABLE "public"."generated_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_assets" TO "service_role";



GRANT ALL ON TABLE "public"."idempotency_cache" TO "anon";
GRANT ALL ON TABLE "public"."idempotency_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."idempotency_cache" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "anon";
GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON TABLE "public"."preset_likes" TO "anon";
GRANT ALL ON TABLE "public"."preset_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."preset_likes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."shared_assets" TO "anon";
GRANT ALL ON TABLE "public"."shared_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_assets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop policy "Public read for Inspire" on "public"."shared_assets";


  create policy "Public read for Inspire"
  on "public"."shared_assets"
  as permissive
  for select
  to anon, authenticated
using (((COALESCE(is_deleted, false) = false) AND ((COALESCE(is_inspire_approved, false) = true) OR (COALESCE(featured, false) = true) OR (COALESCE(staff_pick, false) = true))));



  create policy "Public images are viewable by everyone"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'generated-images'::text));



