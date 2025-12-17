# COMMUNITY SYSTEM OVERHAUL - PHASE 0 DISCOVERY REPORT
**Generated:** 2025-12-03  
**Status:** Discovery Complete - Ready for Planning

---

## EXECUTIVE SUMMARY

The current ArtDirector Studio has **TWO SEPARATE SYSTEMS** for community/sharing functionality:

1. **Community System** (`community_posts`, `community_comments`, `community_likes`) - Modern, functional
2. **Inspire/Gallery System** (`shared_assets`, `inspire_activity`) - Legacy, partially integrated

**Critical Finding:** These systems are **NOT CONNECTED**. Users can share to community OR to gallery, but there's no unified flow. This creates confusion and fragmentation.

---

## 1. DATABASE ARCHITECTURE ANALYSIS

### ✅ EXISTING TABLES

#### Community Tables (Modern - Created 2025-11-23)
```sql
community_posts
  - id, user_id, image_url, caption
  - likes_count, comments_count
  - created_at, updated_at
  - ✅ Has proper indexes
  - ✅ Has RLS policies
  - ✅ Has trigger functions for counters

community_comments
  - id, post_id, user_id, comment_text, created_at
  - ✅ Cascade deletes
  - ✅ Has RLS

community_likes
  - id, post_id, user_id, created_at
  - ✅ Unique constraint (post_id, user_id)
  - ✅ Has RLS
```

#### Inspire/Gallery Tables (Legacy)
```sql
shared_assets
  - id, asset_id, user_id, share_token
  - is_public, is_inspire_approved, featured
  - view_count, bookmark_count, like_count
  - color_palette, composition, lighting, mood, style, tags
  - created_at, updated_at, is_deleted
  - ✅ Has indexes
  - ✅ Has RLS policies

inspire_activity
  - id, shared_asset_id, admin_id, admin_email
  - action_type, created_at
  - Tracks admin moderation actions

asset_bookmarks
  - id, shared_asset_id, user_id, created_at

asset_likes
  - id, shared_asset_id, user_id, created_at
```

### ❌ MISSING FIELDS IN COMMUNITY_POSTS

The `community_posts` table is **missing critical metadata** needed for:
- Remixing (no prompt, tool_used, params)
- Attribution (no remix_source_id)
- Moderation (no moderation_status, is_featured)
- Discovery (no views_count, tags, style metadata)
- Artie Intelligence (no context_prompt, tool metadata)
- Thumbnails (no thumbnail_url)

### ❌ MISSING TABLES

- No `community_follows` (user-to-user)
- No `community_reports` (moderation)
- No `community_tags` (categorization)
- No `community_views` (analytics)

---

## 2. FRONTEND COMPONENT ANALYSIS

### ✅ WORKING COMPONENTS

**Community Page** (`src/pages/Community.tsx`)
- ✅ Infinite scroll with pagination
- ✅ Sort by: trending, recent, discussed
- ✅ Like/unlike functionality
- ✅ Comment system
- ✅ "Discuss with Artie" integration
- ✅ Masonry grid layout
- ✅ Mobile responsive
- ⚠️ **Missing:** Remix button, Open in Studio, metadata display

**ShareToCommunityDialog** (`src/components/community/ShareToCommunityDialog.tsx`)
- ✅ Used in: Studio, Edit, Blend, Upscale, Artie
- ✅ Mobile drawer / Desktop dialog
- ✅ Caption input
- ✅ Title input (optional)
- ⚠️ **Missing:** Tool metadata, prompt injection, remix source tracking

**Gallery Page** (`src/pages/Gallery.tsx`)
- ✅ Displays `shared_assets` (not `community_posts`)
- ✅ Search by prompt
- ✅ View count tracking
- ⚠️ **Missing:** Integration with community, no like/comment, no "Use in Studio"

### ❌ BROKEN/MISSING FLOWS

1. **No "Open in Studio" from Community**
   - Community posts can be discussed with Artie
   - But cannot be loaded into Studio for editing/remixing

2. **No "Remix" functionality**
   - No way to track remix lineage
   - No attribution chain

3. **Gallery vs Community confusion**
   - `/gallery` redirects to `/community` (App.tsx line 182)
   - But Gallery page still exists and uses different data source

4. **No tool badges on community posts**
   - Can't tell if image was from Studio, Blend, Upscale, Edit

5. **No context preservation**
   - When sharing from tools, prompt/params are lost
   - ShareToCommunityDialog only saves caption, not metadata

---

## 3. INTEGRATION POINTS AUDIT

### ✅ TOOLS WITH SHARE INTEGRATION

All major tools have `ShareToCommunityDialog`:
- ✅ `ImageGenerationDialog.tsx` (Studio)
- ✅ `EditImageModal.tsx` (Edit)
- ✅ `ImageBlendDialog.tsx` (Blend)
- ✅ `ImageUpscaleDialog.tsx` (Upscale)
- ✅ `ArtieChat.tsx` (Artie)

### ❌ MISSING INTEGRATIONS

1. **Community → Studio**
   - No "Open in Studio" button
   - No way to load community image as reference

2. **Community → Edit/Blend/Upscale**
   - No direct action buttons

3. **Artie → Community Context**
   - Artie can discuss community posts
   - But doesn't understand tool metadata (because it's not stored)

4. **Landing Page**
   - `FeaturedCommunitySection` exists but may not be using latest data

---

## 4. EDGE FUNCTIONS AUDIT

### ✅ EXISTING FUNCTIONS (No community-specific ones)
- `generate-image`
- `edit-image`
- `blend-images`
- `upscale-image`
- `artie-chat`
- `get-similar-works` (queries `shared_assets`, not `community_posts`)

### ❌ MISSING FUNCTIONS

No edge functions for:
- `community-create-post` (currently done client-side)
- `community-like`
- `community-comment`
- `community-get-trending`
- `community-get-featured`
- `community-moderate`

**Implication:** All community operations are client-side, which is fine for MVP but limits:
- Advanced moderation
- Thumbnail generation
- Content validation
- Rate limiting

---

## 5. RLS & SECURITY ANALYSIS

### ✅ COMMUNITY TABLES RLS

**community_posts:**
- ✅ Public read (`true`)
- ✅ Authenticated insert (user_id = auth.uid())
- ⚠️ **Missing:** Update/delete policies for post authors

**community_comments:**
- ✅ Public read
- ✅ Authenticated insert
- ⚠️ **Missing:** Delete policy for comment authors

**community_likes:**
- ✅ Public read
- ✅ Authenticated insert
- ✅ Authenticated delete (own likes only)

### ✅ SHARED_ASSETS RLS

Multiple policies for:
- Public read (if `is_inspire_approved = true`)
- User read own
- User insert/update/delete own
- Admin moderation

**Status:** RLS is solid, no security leaks identified

---

## 6. NAVIGATION & UX FLOW ANALYSIS

### ✅ NAVIGATION STRUCTURE

**Header/BottomNav:**
- Studio
- Blend
- Upscale
- **Community** (was "Inspire")
- My Projects

**Routes:**
- `/community` → Community.tsx
- `/gallery` → Redirects to `/community`
- `/inspire` → Not found (legacy route)

### ❌ UX ISSUES

1. **Confusing terminology**
   - "Gallery" vs "Community" vs "Inspire"
   - Users don't know where to find shared work

2. **No clear CTA on landing page**
   - FeaturedCommunitySection exists but may not be prominent

3. **No user profiles**
   - Can't click on a username to see their posts
   - No creator pages

4. **No notifications**
   - Users don't know when someone likes/comments

---

## 7. ARTIE INTELLIGENCE INTEGRATION

### ✅ CURRENT ARTIE FEATURES

**Community Integration:**
- ✅ "Discuss with Artie" button on posts
- ✅ Loads image into Artie context
- ✅ Adds to conversation history
- ✅ Adds to context memory

**System Prompt:**
- ✅ Knows about "Inspire" (legacy name)
- ✅ Has `OPEN_INSPIRE` action

### ❌ MISSING ARTIE FEATURES

1. **No tool metadata in context**
   - Artie can't say "This was made with Blend"
   - Can't suggest similar techniques

2. **No remix suggestions**
   - Artie can't say "Want to remix this?"

3. **No trending insights**
   - Artie can't say "This style is trending in the community"

4. **No attribution awareness**
   - Artie doesn't know if image is a remix

---

## 8. PERFORMANCE & CACHING

### ✅ CURRENT OPTIMIZATIONS

**Community Page:**
- ✅ Infinite scroll with pagination (12 per page)
- ✅ React Query caching
- ✅ Lazy loading images
- ✅ Intersection Observer for load-more

**Gallery Page:**
- ✅ Image optimization with `getOptimizedImageUrl`
- ✅ WebP format, quality/size params
- ✅ Lazy loading

### ❌ MISSING OPTIMIZATIONS

1. **No thumbnail generation**
   - Full images loaded in grid (slow)

2. **No CDN caching**
   - All images served directly from Supabase Storage

3. **No prefetching**
   - Could prefetch next page on hover

4. **No response caching**
   - Same queries run repeatedly

---

## 9. IDENTIFIED BUGS & ISSUES

### 🐛 CRITICAL BUGS

1. **Duplicate systems**
   - `community_posts` and `shared_assets` serve similar purposes
   - No migration path between them

2. **Lost metadata on share**
   - ShareToCommunityDialog doesn't capture:
     - Tool used
     - Original prompt
     - Generation params
     - Aspect ratio
     - Model version

3. **No remix tracking**
   - Can't attribute derived works

### ⚠️ MEDIUM ISSUES

4. **Gallery page orphaned**
   - Still exists but redirects
   - Uses old `shared_assets` table
   - Confusing for users

5. **No moderation UI**
   - `community_posts` has no moderation_status field
   - Admins can't approve/reject

6. **Missing indexes**
   - No index on `community_posts.user_id`
   - Could slow down "my posts" queries

### 💡 MINOR ISSUES

7. **No view count**
   - `community_posts` doesn't track views
   - `shared_assets` does

8. **No featured posts**
   - `community_posts` has no `is_featured` field

9. **No tags/categories**
   - Hard to discover content by style/tool

---

## 10. PROPOSED ARCHITECTURE DECISION

### OPTION A: Extend `community_posts` (RECOMMENDED)

**Pros:**
- Modern, clean schema
- Already has working UI
- Better naming ("community" vs "inspire")
- Simpler to extend

**Cons:**
- Need to migrate existing `shared_assets` data
- Need to add many fields

**Migration Strategy:**
- Add fields to `community_posts` (non-breaking)
- Backfill from `shared_assets` where applicable
- Deprecate `shared_assets` for new posts
- Keep `shared_assets` for legacy data (read-only)

### OPTION B: Merge into `shared_assets`

**Pros:**
- Already has rich metadata
- Has moderation fields
- Has view tracking

**Cons:**
- Confusing name ("shared_assets" vs "community")
- More complex schema
- Would need to rename/refactor

**Verdict:** **OPTION A** is cleaner and more future-proof.

---

## 11. RECOMMENDED SCHEMA EXTENSIONS

### Add to `community_posts`:

```sql
-- Metadata for remixing
prompt TEXT,
context_prompt TEXT,
tool_used TEXT, -- 'studio', 'edit', 'blend', 'upscale', 'artie'
params JSONB,
aspect_ratio TEXT,
model_version TEXT,

-- Attribution
remix_source_id UUID REFERENCES community_posts(id),
original_author_id UUID REFERENCES profiles(id),

-- Moderation
moderation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
is_featured BOOLEAN DEFAULT false,
is_staff_pick BOOLEAN DEFAULT false,

-- Discovery
views_count INTEGER DEFAULT 0,
shares_count INTEGER DEFAULT 0,
thumbnail_url TEXT,
tags TEXT[],

-- Metadata (optional, for future)
style TEXT,
mood TEXT,
color_palette TEXT,
```

### New tables:

```sql
-- User follows
community_follows (
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
)

-- Post reports
community_reports (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id),
  reporter_id UUID REFERENCES profiles(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- View tracking
community_views (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id),
  viewer_id UUID REFERENCES profiles(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 12. INTEGRATION REQUIREMENTS

### Studio → Community
- ✅ Already has ShareToCommunityDialog
- ❌ Need to pass: prompt, tool='studio', params, aspect_ratio

### Edit → Community
- ✅ Already has ShareToCommunityDialog
- ❌ Need to pass: original_image_url, tool='edit', edit_type, params

### Blend → Community
- ✅ Already has ShareToCommunityDialog
- ❌ Need to pass: source_image_urls, tool='blend', blend_ratio

### Upscale → Community
- ✅ Already has ShareToCommunityDialog
- ❌ Need to pass: original_image_url, tool='upscale', scale_factor

### Artie → Community
- ✅ Already has ShareToCommunityDialog
- ❌ Need to pass: conversation_context, tool='artie', prompt

### Community → Studio
- ❌ Need: "Open in Studio" button
- ❌ Load image as reference
- ❌ Pre-fill prompt if available

### Community → Edit/Blend/Upscale
- ❌ Need: Direct action buttons
- ❌ Load image into respective tools

### Community → Artie
- ✅ "Discuss with Artie" works
- ❌ Need: Pass tool metadata for better context

---

## 13. NEXT STEPS - PROPOSED FILE CHANGE PLAN

### PHASE 1: Database Migration (Non-Breaking)

**Files to create:**
1. `supabase/migrations/20251203_extend_community_posts.sql`
   - Add metadata fields
   - Add indexes
   - Add RLS policies for update/delete

2. `supabase/migrations/20251203_community_supplementary_tables.sql`
   - Create `community_follows`
   - Create `community_reports`
   - Create `community_views`

**Files to update:**
3. `src/integrations/supabase/types.ts`
   - Regenerate types after migration

### PHASE 2: Backend Functions (Optional for MVP)

**Files to create:**
4. `supabase/functions/community-create-post/index.ts`
5. `supabase/functions/community-get-trending/index.ts`
6. `supabase/functions/community-moderate/index.ts`

### PHASE 3: Frontend - ShareToCommunityDialog Enhancement

**Files to update:**
7. `src/components/community/ShareToCommunityDialog.tsx`
   - Accept tool metadata props
   - Store in community_posts

8. `src/components/ImageGenerationDialog.tsx`
   - Pass prompt, tool='studio', params to ShareToCommunityDialog

9. `src/components/edit-image/EditImageModal.tsx`
   - Pass edit metadata to ShareToCommunityDialog

10. `src/components/ImageBlendDialog.tsx`
    - Pass blend metadata to ShareToCommunityDialog

11. `src/components/ImageUpscaleDialog.tsx`
    - Pass upscale metadata to ShareToCommunityDialog

12. `src/components/ArtieChat.tsx`
    - Pass Artie context to ShareToCommunityDialog

### PHASE 4: Frontend - Community Page Enhancement

**Files to update:**
13. `src/pages/Community.tsx`
    - Add "Open in Studio" button
    - Add "Remix" button
    - Add "Edit" / "Upscale" / "Blend" buttons
    - Display tool badges
    - Display prompt (if available)
    - Add view tracking
    - Update Artie integration to pass tool metadata

**Files to create:**
14. `src/components/community/CommunityPostCard.tsx`
    - Extract post card into reusable component
    - Add all action buttons

15. `src/components/community/CommunityPostActions.tsx`
    - Remix, Open in Studio, Edit, etc.

### PHASE 5: Frontend - Tool Integration

**Files to update:**
16. `src/hooks/useArtieCore.ts`
    - Update OPEN_INSPIRE to use community data
    - Add tool metadata awareness

17. `src/lib/artieSystemPrompt.ts`
    - Update references from "Inspire" to "Community"
    - Add tool metadata instructions

### PHASE 6: Frontend - Gallery Deprecation

**Files to update:**
18. `src/pages/Gallery.tsx`
    - Deprecate or merge into Community
    - Or keep as "My Shared Assets" view

19. `src/App.tsx`
    - Already redirects /gallery to /community
    - Consider removing Gallery page entirely

### PHASE 7: Landing Page Integration

**Files to update:**
20. `src/components/landing/FeaturedCommunitySection.tsx`
    - Ensure using latest community_posts
    - Add "Explore Community" CTA

21. `src/pages/Index.tsx`
    - Verify FeaturedCommunitySection is prominent

### PHASE 8: Performance Optimization

**Files to create:**
22. `src/lib/communityCache.ts`
    - Implement response caching
    - Prefetching logic

**Files to update:**
23. `src/pages/Community.tsx`
    - Add thumbnail support
    - Add prefetching on hover

### PHASE 9: Testing & QA

**Files to create:**
24. `.agent/COMMUNITY_SYSTEM_QA_CHECKLIST.md`
    - Comprehensive test plan

---

## 14. RISK ASSESSMENT

### 🔴 HIGH RISK
- **Data migration** from `shared_assets` to `community_posts`
  - Mitigation: Keep both tables, migrate incrementally

### 🟡 MEDIUM RISK
- **Breaking existing shares** if schema changes incorrectly
  - Mitigation: Additive migrations only, no column drops

### 🟢 LOW RISK
- **UI changes** are low risk (no data impact)
- **Adding new features** is low risk (opt-in)

---

## 15. ESTIMATED EFFORT

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: DB Migration | 2-3 hours | P0 |
| Phase 2: Edge Functions | 3-4 hours | P2 (Optional) |
| Phase 3: Share Dialog | 2-3 hours | P0 |
| Phase 4: Community Page | 4-5 hours | P0 |
| Phase 5: Tool Integration | 3-4 hours | P0 |
| Phase 6: Gallery Deprecation | 1-2 hours | P1 |
| Phase 7: Landing Page | 1-2 hours | P1 |
| Phase 8: Performance | 2-3 hours | P2 |
| Phase 9: QA | 2-3 hours | P0 |
| **TOTAL** | **20-29 hours** | |

---

## 16. CONCLUSION

The current community system is **functional but incomplete**. The main issues are:

1. **Missing metadata** for remixing and attribution
2. **No "Open in Studio" flow** from community
3. **Duplicate systems** (community_posts vs shared_assets)
4. **Lost context** when sharing from tools

**Recommended Approach:**
- ✅ Extend `community_posts` with metadata fields (non-breaking)
- ✅ Update ShareToCommunityDialog to capture tool context
- ✅ Add action buttons to Community page (Remix, Open in Studio, etc.)
- ✅ Integrate Artie with tool metadata
- ✅ Deprecate or merge Gallery page
- ✅ Add performance optimizations (thumbnails, caching)

**This is a safe, incremental refactor** that won't break existing functionality.

---

**Ready to proceed to Phase 1?**
