# COMMUNITY SYSTEM OVERHAUL - IMPLEMENTATION PLAN
**Version:** 1.0  
**Date:** 2025-12-03  
**Status:** Ready for Execution

---

## OVERVIEW

This plan implements a **safe, incremental refactor** of the Community/Inspire system based on the findings in `COMMUNITY_SYSTEM_DISCOVERY_REPORT.md`.

**Core Principles:**
- ✅ **Non-breaking migrations** (additive only)
- ✅ **Backward compatible** (keep existing data)
- ✅ **Incremental rollout** (phase by phase)
- ✅ **Safe RLS** (no security regressions)
- ✅ **Performance first** (caching, thumbnails, lazy loading)

---

## PHASE 1: DATABASE RESTRUCTURE (NON-BREAKING MIGRATION)

### 1.1 Extend `community_posts` Table

**File:** `supabase/migrations/20251203010000_extend_community_posts.sql`

```sql
-- Add metadata fields for remixing and attribution
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS context_prompt TEXT,
  ADD COLUMN IF NOT EXISTS tool_used TEXT CHECK (tool_used IN ('studio', 'edit', 'blend', 'upscale', 'artie')),
  ADD COLUMN IF NOT EXISTS params JSONB,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'google/gemini-3-pro-image-preview',
  
  -- Attribution
  ADD COLUMN IF NOT EXISTS remix_source_id UUID REFERENCES public.community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Moderation
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  
  -- Discovery
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  
  -- Metadata (for future AI/search)
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS color_palette TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_tool_used ON public.community_posts(tool_used) WHERE tool_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_moderation ON public.community_posts(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON public.community_posts(is_featured, created_at DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_views ON public.community_posts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_remix_source ON public.community_posts(remix_source_id) WHERE remix_source_id IS NOT NULL;

-- Add RLS policies for update/delete
CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to increment views_count
CREATE OR REPLACE FUNCTION public.increment_community_post_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
    SET views_count = views_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: View tracking will be added in supplementary tables migration
```

### 1.2 Create Supplementary Tables

**File:** `supabase/migrations/20251203020000_community_supplementary_tables.sql`

```sql
-- User follows
CREATE TABLE IF NOT EXISTS public.community_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT community_follows_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_community_follows_follower ON public.community_follows(follower_id);
CREATE INDEX idx_community_follows_following ON public.community_follows(following_id);

ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read follows" ON public.community_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.community_follows FOR DELETE USING (auth.uid() = follower_id);

-- Post reports (moderation)
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_community_reports_post ON public.community_reports(post_id);
CREATE INDEX idx_community_reports_status ON public.community_reports(status, created_at DESC);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report posts" ON public.community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
-- Note: Only admins should read reports (implement admin role check later)

-- View tracking
CREATE TABLE IF NOT EXISTS public.community_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_views_post ON public.community_views(post_id, created_at DESC);
CREATE INDEX idx_community_views_viewer ON public.community_views(viewer_id) WHERE viewer_id IS NOT NULL;

ALTER TABLE public.community_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert views" ON public.community_views FOR INSERT WITH CHECK (true);
-- Views are write-only for analytics

-- Add trigger to increment views_count on community_posts
DROP TRIGGER IF EXISTS community_view_insert ON public.community_views;
CREATE TRIGGER community_view_insert
  AFTER INSERT ON public.community_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_community_post_view();

-- Add function to track unique views (debounced by session)
CREATE OR REPLACE FUNCTION public.track_community_post_view(
  p_post_id UUID,
  p_viewer_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Update TypeScript Types

**Action:** Regenerate Supabase types after migrations

```bash
npx supabase gen types typescript --project-id vsbjxktlrbfxfhxiqzlr > src/integrations/supabase/types.ts
```

---

## PHASE 2: BACKEND - EDGE FUNCTIONS (OPTIONAL FOR MVP)

**Decision:** Skip for now. Client-side operations are sufficient for MVP.

**Future consideration:** Add edge functions for:
- Thumbnail generation
- Content moderation (AI-based)
- Advanced analytics
- Rate limiting

---

## PHASE 3: FRONTEND - SHARE DIALOG ENHANCEMENT

### 3.1 Update ShareToCommunityDialog

**File:** `src/components/community/ShareToCommunityDialog.tsx`

**Changes:**
1. Add props for metadata:
   ```typescript
   interface ShareToCommunityDialogProps {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     imageUrl?: string | null;
     defaultCaption?: string;
     defaultTitle?: string;
     onShared?: (postId: string) => void;
     
     // NEW: Metadata props
     prompt?: string;
     contextPrompt?: string;
     toolUsed?: 'studio' | 'edit' | 'blend' | 'upscale' | 'artie';
     params?: Record<string, any>;
     aspectRatio?: string;
     remixSourceId?: string;
     thumbnailUrl?: string;
   }
   ```

2. Update insert to include metadata:
   ```typescript
   const { data, error } = await supabase
     .from("community_posts")
     .insert({
       user_id: user.id,
       image_url: imageUrl,
       caption: caption?.trim() || title?.trim() || "Shared via ArtDirector Studio",
       prompt: prompt,
       context_prompt: contextPrompt,
       tool_used: toolUsed,
       params: params,
       aspect_ratio: aspectRatio,
       remix_source_id: remixSourceId,
       thumbnail_url: thumbnailUrl,
     })
     .select("id")
     .single();
   ```

### 3.2 Update Tool Integrations

**Files to update:**
1. `src/components/ImageGenerationDialog.tsx`
2. `src/components/edit-image/EditImageModal.tsx`
3. `src/components/ImageBlendDialog.tsx`
4. `src/components/ImageUpscaleDialog.tsx`
5. `src/components/ArtieChat.tsx`

**Pattern for each:**
```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={generatedImageUrl}
  defaultCaption={prompt}
  
  // NEW: Pass metadata
  prompt={prompt}
  toolUsed="studio" // or 'edit', 'blend', 'upscale', 'artie'
  params={{
    // Tool-specific params
    aspectRatio: selectedAspectRatio,
    model: 'google/gemini-3-pro-image-preview',
    // etc.
  }}
  aspectRatio={selectedAspectRatio}
  thumbnailUrl={thumbnailUrl} // if available
/>
```

---

## PHASE 4: FRONTEND - COMMUNITY PAGE ENHANCEMENT

### 4.1 Create CommunityPostCard Component

**File:** `src/components/community/CommunityPostCard.tsx`

**Features:**
- Display tool badge
- Display prompt (if available)
- Action buttons: Like, Comment, Discuss with Artie, **Remix**, **Open in Studio**
- Metadata display (aspect ratio, model, etc.)

### 4.2 Create CommunityPostActions Component

**File:** `src/components/community/CommunityPostActions.tsx`

**Actions:**
1. **Remix** → Open in Studio with prompt pre-filled, track remix_source_id
2. **Open in Studio** → Load as reference image
3. **Edit** → Open Edit modal with image
4. **Upscale** → Open Upscale modal with image
5. **Blend** → Open Blend modal with image as one source

### 4.3 Update Community Page

**File:** `src/pages/Community.tsx`

**Changes:**
1. Use `CommunityPostCard` component
2. Add view tracking on post view
3. Update Artie integration to pass tool metadata
4. Add filter by tool
5. Add "Featured" section

---

## PHASE 5: FRONTEND - TOOL INTEGRATION (COMMUNITY → TOOLS)

### 5.1 Remix Flow

**Trigger:** User clicks "Remix" on community post

**Flow:**
1. Extract post metadata (prompt, tool_used, params)
2. Navigate to appropriate tool (Studio, Edit, Blend, etc.)
3. Pre-fill form with metadata
4. Set `remix_source_id` for attribution
5. On share, link back to original post

**Implementation:**
- Add `useRemix` hook
- Update tool dialogs to accept `remixSource` prop
- Update ShareToCommunityDialog to set `remix_source_id`

### 5.2 Open in Studio Flow

**Trigger:** User clicks "Open in Studio" on community post

**Flow:**
1. Load image as reference
2. Pre-fill prompt (if available)
3. Open Studio dialog

**Implementation:**
- Add to `CommunityPostActions`
- Use `useUnifiedVisualContext` to set reference image

### 5.3 Artie Integration Enhancement

**File:** `src/hooks/useArtieCore.ts`

**Changes:**
- Update `OPEN_INSPIRE` to use `community_posts`
- Pass tool metadata in context

**File:** `src/lib/artieSystemPrompt.ts`

**Changes:**
- Update references from "Inspire" to "Community"
- Add tool metadata instructions:
  ```
  When discussing community posts, mention the tool used if available.
  Example: "This was created using the Blend tool with a 60/40 ratio."
  ```

---

## PHASE 6: FRONTEND - GALLERY DEPRECATION

### Option A: Remove Gallery Page (RECOMMENDED)

**Files to delete:**
- `src/pages/Gallery.tsx`

**Files to update:**
- `src/App.tsx` → Remove Gallery route (already redirects)

### Option B: Repurpose as "My Shared Posts"

**Files to update:**
- `src/pages/Gallery.tsx` → Rename to `MySharedPosts.tsx`
- Query `community_posts` WHERE `user_id = auth.uid()`
- Add to user profile/settings

**Decision:** Go with **Option A** for simplicity.

---

## PHASE 7: LANDING PAGE INTEGRATION

### 7.1 Update FeaturedCommunitySection

**File:** `src/components/landing/FeaturedCommunitySection.tsx`

**Changes:**
1. Query `community_posts` WHERE `is_featured = true`
2. Sort by `created_at DESC`
3. Limit to 6-8 posts
4. Add "Explore Community" CTA button

### 7.2 Update Landing Page

**File:** `src/pages/Index.tsx`

**Changes:**
- Ensure `FeaturedCommunitySection` is prominent
- Add hero CTA: "Explore Community"

---

## PHASE 8: PERFORMANCE OPTIMIZATION

### 8.1 Thumbnail Generation

**Strategy:** Generate thumbnails on upload

**Implementation:**
1. Add thumbnail generation to ShareToCommunityDialog
2. Use `getOptimizedImageUrl` with small dimensions
3. Store in `thumbnail_url` field

**Code:**
```typescript
const thumbnailUrl = getOptimizedImageUrl(imageUrl, {
  width: 400,
  quality: 75,
  format: 'webp'
});
```

### 8.2 Lazy Loading & Prefetching

**File:** `src/pages/Community.tsx`

**Changes:**
1. Use `thumbnail_url` in grid (already using lazy loading)
2. Add prefetch on hover:
   ```typescript
   const handlePostHover = (post: CommunityPost) => {
     // Prefetch full image
     const img = new Image();
     img.src = post.image_url;
   };
   ```

### 8.3 Response Caching

**File:** `src/lib/communityCache.ts` (new)

**Features:**
- Cache trending posts (5 min TTL)
- Cache featured posts (10 min TTL)
- Use React Query's built-in caching

---

## PHASE 9: QA & VALIDATION

### 9.1 Test Checklist

**File:** `.agent/COMMUNITY_SYSTEM_QA_CHECKLIST.md`

**Tests:**
- [ ] Can share from Studio with metadata
- [ ] Can share from Edit with metadata
- [ ] Can share from Blend with metadata
- [ ] Can share from Upscale with metadata
- [ ] Can share from Artie with metadata
- [ ] Community post displays tool badge
- [ ] Community post displays prompt
- [ ] Can like/unlike post
- [ ] Can comment on post
- [ ] Can "Discuss with Artie" from post
- [ ] Can "Remix" post (opens Studio with prompt)
- [ ] Can "Open in Studio" (loads as reference)
- [ ] Remix attribution works (remix_source_id set)
- [ ] View tracking works (views_count increments)
- [ ] Featured posts display correctly
- [ ] Sorting works (trending, recent, discussed)
- [ ] Mobile responsive
- [ ] Performance is acceptable (grid loads fast)
- [ ] No RLS errors
- [ ] No console errors

### 9.2 Validation Workflow

1. **Database Validation**
   - Run migrations on staging
   - Verify indexes created
   - Verify RLS policies work
   - Test insert/update/delete

2. **Frontend Validation**
   - Share from each tool
   - Verify metadata saved
   - Verify display correct
   - Test all actions

3. **Integration Validation**
   - Test Remix flow end-to-end
   - Test Artie integration
   - Test view tracking

4. **Performance Validation**
   - Measure grid load time
   - Measure infinite scroll performance
   - Check network requests

---

## EXECUTION ORDER

### Step-by-Step Execution

1. ✅ **Run Database Migrations**
   ```bash
   # Apply migrations to Supabase
   npx supabase db push
   
   # Regenerate types
   npx supabase gen types typescript --project-id vsbjxktlrbfxfhxiqzlr > src/integrations/supabase/types.ts
   ```

2. ✅ **Update ShareToCommunityDialog**
   - Add metadata props
   - Update insert logic

3. ✅ **Update Tool Integrations (5 files)**
   - ImageGenerationDialog
   - EditImageModal
   - ImageBlendDialog
   - ImageUpscaleDialog
   - ArtieChat

4. ✅ **Create CommunityPostCard Component**
   - Extract from Community.tsx
   - Add tool badge
   - Add prompt display

5. ✅ **Create CommunityPostActions Component**
   - Remix button
   - Open in Studio button
   - Edit/Upscale/Blend buttons

6. ✅ **Update Community Page**
   - Use new components
   - Add view tracking
   - Add tool filter

7. ✅ **Update Artie Integration**
   - useArtieCore.ts
   - artieSystemPrompt.ts

8. ✅ **Remove Gallery Page**
   - Delete Gallery.tsx
   - Clean up routes

9. ✅ **Update Landing Page**
   - FeaturedCommunitySection
   - Hero CTA

10. ✅ **Add Performance Optimizations**
    - Thumbnail generation
    - Prefetching
    - Caching

11. ✅ **QA Testing**
    - Run through checklist
    - Fix any issues

12. ✅ **Deploy**
    - Commit changes
    - Push to production
    - Monitor for errors

---

## ROLLBACK PLAN

If anything goes wrong:

1. **Database Rollback**
   - Migrations are additive, so no rollback needed
   - Old code will ignore new fields

2. **Frontend Rollback**
   - Revert commits
   - Deploy previous version

3. **Data Integrity**
   - No data loss (all migrations are additive)
   - Old posts still work (new fields are optional)

---

## SUCCESS METRICS

After implementation, we should see:

- ✅ **100% of shares** include tool metadata
- ✅ **Remix flow** works end-to-end
- ✅ **Community → Studio** flow works
- ✅ **Artie integration** understands tool context
- ✅ **View tracking** works
- ✅ **Performance** is acceptable (grid loads < 2s)
- ✅ **No RLS errors**
- ✅ **No console errors**
- ✅ **Mobile responsive**

---

## TIMELINE ESTIMATE

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: DB Migration | 1-2 hours | None |
| Phase 3: Share Dialog | 2-3 hours | Phase 1 |
| Phase 4: Community Page | 4-5 hours | Phase 3 |
| Phase 5: Tool Integration | 3-4 hours | Phase 4 |
| Phase 6: Gallery Deprecation | 1 hour | None |
| Phase 7: Landing Page | 1-2 hours | Phase 4 |
| Phase 8: Performance | 2-3 hours | Phase 4 |
| Phase 9: QA | 2-3 hours | All |
| **TOTAL** | **16-23 hours** | |

---

## READY TO BEGIN?

**Recommended Start:** Phase 1 (Database Migration)

This plan is **safe, incremental, and non-breaking**. We can proceed phase by phase, testing at each step.

**Next Action:** Create migration files and apply to database.
