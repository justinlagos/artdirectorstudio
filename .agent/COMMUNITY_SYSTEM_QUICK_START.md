# COMMUNITY SYSTEM OVERHAUL - QUICK START GUIDE
**Ready to begin? Follow these steps.**

---

## ⚡ PHASE 0: REVIEW (5-10 minutes)

### Read the Documentation

1. **Start here:** `.agent/COMMUNITY_SYSTEM_EXECUTIVE_SUMMARY.md`
   - High-level overview
   - What's changing and why

2. **Understand the problem:** `.agent/COMMUNITY_SYSTEM_DISCOVERY_REPORT.md`
   - Current state analysis
   - Issues identified

3. **Review the plan:** `.agent/COMMUNITY_SYSTEM_IMPLEMENTATION_PLAN.md`
   - Step-by-step instructions
   - Code examples

4. **Visualize the change:** `.agent/COMMUNITY_SYSTEM_ARCHITECTURE_COMPARISON.md`
   - Before/after diagrams
   - Data flow comparisons

### Confirm Understanding

- [ ] I understand we're extending `community_posts` (not replacing)
- [ ] I understand migrations are non-breaking (additive only)
- [ ] I understand the timeline (16-23 hours total)
- [ ] I'm ready to proceed

---

## 🚀 PHASE 1: DATABASE MIGRATION (1-2 hours)

### Step 1.1: Create Migration Files

Create these two files in `supabase/migrations/`:

**File 1:** `20251203010000_extend_community_posts.sql`

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
```

**File 2:** `20251203020000_community_supplementary_tables.sql`

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

### Step 1.2: Apply Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Navigate to project directory
cd /Users/Justin/artdirectorstudio

# Apply migrations
npx supabase db push

# Verify migrations applied
npx supabase db diff
```

**Option B: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard/project/vsbjxktlrbfxfhxiqzlr/editor
2. Click "SQL Editor"
3. Copy/paste migration 1 SQL
4. Run
5. Copy/paste migration 2 SQL
6. Run

### Step 1.3: Regenerate TypeScript Types

```bash
npx supabase gen types typescript --project-id vsbjxktlrbfxfhxiqzlr > src/integrations/supabase/types.ts
```

### Step 1.4: Verify Migration Success

**Check in Supabase Dashboard:**
1. Go to Table Editor
2. Open `community_posts` table
3. Verify new columns exist:
   - `prompt`
   - `tool_used`
   - `params`
   - `remix_source_id`
   - etc.

**Check in code:**
1. Open `src/integrations/supabase/types.ts`
2. Find `community_posts` type
3. Verify new fields are typed

**Run a test query:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_posts'
ORDER BY ordinal_position;
```

---

## 🎨 PHASE 3: UPDATE SHARE DIALOG (2-3 hours)

### Step 3.1: Update ShareToCommunityDialog

**File:** `src/components/community/ShareToCommunityDialog.tsx`

**Add new props to interface:**

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

**Update the component signature:**

```typescript
export const ShareToCommunityDialog = ({
  open,
  onOpenChange,
  imageUrl,
  defaultCaption,
  defaultTitle,
  onShared,
  // NEW
  prompt,
  contextPrompt,
  toolUsed,
  params,
  aspectRatio,
  remixSourceId,
  thumbnailUrl,
}: ShareToCommunityDialogProps) => {
```

**Update the insert logic:**

```typescript
const { data, error } = await supabase
  .from("community_posts")
  .insert({
    user_id: user.id,
    image_url: imageUrl,
    caption: caption?.trim() || title?.trim() || "Shared via ArtDirector Studio",
    // NEW: Add metadata
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

### Step 3.2: Update ImageGenerationDialog

**File:** `src/components/ImageGenerationDialog.tsx`

**Find the ShareToCommunityDialog usage** (around line 988)

**Update to:**

```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={generatedImageUrl}
  defaultCaption={prompt}
  // NEW: Pass metadata
  prompt={prompt}
  toolUsed="studio"
  params={{
    aspectRatio: selectedAspectRatio,
    model: 'google/gemini-3-pro-image-preview',
  }}
  aspectRatio={selectedAspectRatio}
/>
```

### Step 3.3: Update EditImageModal

**File:** `src/components/edit-image/EditImageModal.tsx`

**Find ShareToCommunityDialog usage** (around line 783)

**Update to:**

```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={editedImageUrl}
  defaultCaption={`Edited: ${originalPrompt || 'Image'}`}
  // NEW: Pass metadata
  prompt={originalPrompt}
  toolUsed="edit"
  params={{
    editType: selectedEditType,
    // Add other edit params
  }}
/>
```

### Step 3.4: Update ImageBlendDialog

**File:** `src/components/ImageBlendDialog.tsx`

**Find ShareToCommunityDialog usage** (around line 789)

**Update to:**

```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={blendedImageUrl}
  defaultCaption="Blended creation"
  // NEW: Pass metadata
  toolUsed="blend"
  params={{
    blendRatio: blendRatio,
    sourceImages: [image1Url, image2Url],
  }}
/>
```

### Step 3.5: Update ImageUpscaleDialog

**File:** `src/components/ImageUpscaleDialog.tsx`

**Find ShareToCommunityDialog usage** (around line 667)

**Update to:**

```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={upscaledImageUrl}
  defaultCaption="Upscaled image"
  // NEW: Pass metadata
  toolUsed="upscale"
  params={{
    scaleFactor: scaleFactor,
  }}
/>
```

### Step 3.6: Update ArtieChat

**File:** `src/components/ArtieChat.tsx`

**Find ShareToCommunityDialog usage** (around line 2420)

**Update to:**

```typescript
<ShareToCommunityDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  imageUrl={imageToShare}
  defaultCaption={promptToShare}
  // NEW: Pass metadata
  prompt={promptToShare}
  toolUsed="artie"
  params={{
    conversationContext: /* relevant context */,
  }}
/>
```

---

## ✅ QUICK VALIDATION

After Phase 1 and Phase 3:

1. **Generate an image in Studio**
2. **Click "Share to Community"**
3. **Submit**
4. **Check database:**
   ```sql
   SELECT id, prompt, tool_used, params 
   FROM community_posts 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
5. **Verify:**
   - ✅ `prompt` is set
   - ✅ `tool_used` = 'studio'
   - ✅ `params` contains data

**If this works, you're 30% done! 🎉**

---

## 📋 NEXT PHASES

Once Phase 1 and 3 are complete and validated:

- **Phase 4:** Community Page Enhancement (4-5 hours)
  - Create CommunityPostCard component
  - Add Remix/Open in Studio buttons
  - Display tool badges

- **Phase 5:** Tool Integration (3-4 hours)
  - Implement Remix flow
  - Implement Open in Studio flow

- **Phase 6-9:** Polish and deploy (5-7 hours)

**See `.agent/COMMUNITY_SYSTEM_IMPLEMENTATION_PLAN.md` for detailed instructions.**

---

## 🆘 TROUBLESHOOTING

### Migration fails

**Error:** "column already exists"
- **Solution:** Migrations use `IF NOT EXISTS`, so this shouldn't happen. If it does, the column was already added manually. Safe to ignore.

**Error:** "permission denied"
- **Solution:** Ensure you're using the correct Supabase project ID and have admin access.

### TypeScript errors after regenerating types

**Error:** "Property 'prompt' does not exist"
- **Solution:** Restart TypeScript server in VS Code (Cmd+Shift+P → "TypeScript: Restart TS Server")

### Share dialog doesn't save metadata

**Check:**
1. Did you update ShareToCommunityDialog props?
2. Did you update the insert statement?
3. Did you pass metadata from tools?
4. Check browser console for errors

---

## 📞 NEED HELP?

If you encounter issues:

1. **Check the logs:**
   - Supabase Dashboard → Logs
   - Browser DevTools → Console

2. **Review the docs:**
   - Discovery Report (Section 9: Identified Bugs)
   - Implementation Plan (Rollback Plan)

3. **Ask for help:**
   - Provide error message
   - Provide steps to reproduce
   - Provide relevant code snippet

---

## 🎯 SUCCESS CRITERIA

After Phase 1 and 3, you should be able to:

- ✅ Share from Studio with full metadata
- ✅ See metadata in database
- ✅ No errors in console
- ✅ No TypeScript errors

**If all ✅, proceed to Phase 4!**

---

**Ready? Let's start with Phase 1! 🚀**
