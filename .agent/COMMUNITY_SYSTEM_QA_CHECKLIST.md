# COMMUNITY SYSTEM QA CHECKLIST
**Version:** 1.0  
**Date:** 2025-12-03  
**Purpose:** Comprehensive testing checklist for Community System Overhaul

---

## PRE-DEPLOYMENT CHECKS

### Database Migration Validation

- [ ] **Migration 1 applied successfully** (`20251203010000_extend_community_posts.sql`)
  - [ ] All new columns added to `community_posts`
  - [ ] All indexes created
  - [ ] RLS policies created (update, delete)
  - [ ] No migration errors in logs

- [ ] **Migration 2 applied successfully** (`20251203020000_community_supplementary_tables.sql`)
  - [ ] `community_follows` table created
  - [ ] `community_reports` table created
  - [ ] `community_views` table created
  - [ ] All indexes created
  - [ ] RLS policies created
  - [ ] Trigger functions created

- [ ] **TypeScript types regenerated**
  - [ ] `src/integrations/supabase/types.ts` updated
  - [ ] No TypeScript errors in IDE
  - [ ] All new fields typed correctly

---

## PHASE 3: SHARE DIALOG TESTING

### Studio → Community

- [ ] **Open Studio** (`/studio`)
- [ ] **Generate an image** with prompt "A futuristic cityscape at sunset"
- [ ] **Click "Share to Community"**
- [ ] **Verify dialog shows:**
  - [ ] Image preview
  - [ ] Caption field (pre-filled with prompt)
  - [ ] Title field (optional)
- [ ] **Submit share**
- [ ] **Verify in database:**
  ```sql
  SELECT id, prompt, tool_used, params, aspect_ratio
  FROM community_posts
  ORDER BY created_at DESC
  LIMIT 1;
  ```
  - [ ] `prompt` = "A futuristic cityscape at sunset"
  - [ ] `tool_used` = "studio"
  - [ ] `params` contains generation parameters
  - [ ] `aspect_ratio` is set correctly
- [ ] **Verify toast notification** "Shared with the community!"
- [ ] **Click "View Community"** in toast
- [ ] **Verify redirects to** `/community`

### Edit → Community

- [ ] **Open Studio** and generate an image
- [ ] **Click "Edit Image"**
- [ ] **Apply an edit** (e.g., brightness adjustment)
- [ ] **Click "Share to Community"**
- [ ] **Verify in database:**
  - [ ] `tool_used` = "edit"
  - [ ] `params` contains edit parameters
  - [ ] `prompt` is set (if available)

### Blend → Community

- [ ] **Open Blend tool** (`/blend`)
- [ ] **Upload two images**
- [ ] **Set blend ratio** (e.g., 60/40)
- [ ] **Generate blend**
- [ ] **Click "Share to Community"**
- [ ] **Verify in database:**
  - [ ] `tool_used` = "blend"
  - [ ] `params` contains blend ratio and source images

### Upscale → Community

- [ ] **Open Upscale tool** (`/upscale`)
- [ ] **Upload an image**
- [ ] **Upscale 2x**
- [ ] **Click "Share to Community"**
- [ ] **Verify in database:**
  - [ ] `tool_used` = "upscale"
  - [ ] `params` contains scale factor

### Artie → Community

- [ ] **Open Artie chat**
- [ ] **Generate an image** via Artie
- [ ] **Click "Share to Community"**
- [ ] **Verify in database:**
  - [ ] `tool_used` = "artie"
  - [ ] `prompt` contains Artie conversation context
  - [ ] `params` contains Artie metadata

---

## PHASE 4: COMMUNITY PAGE TESTING

### Post Display

- [ ] **Navigate to** `/community`
- [ ] **Verify posts load**
- [ ] **Verify each post card shows:**
  - [ ] User avatar and username
  - [ ] Image (full quality or thumbnail)
  - [ ] Caption (if set)
  - [ ] **Tool badge** (e.g., "Studio", "Blend", "Edit")
  - [ ] **Prompt** (if available, truncated or expandable)
  - [ ] Like count
  - [ ] Comment count
  - [ ] Timestamp ("X hours ago")

### Tool Badge Display

- [ ] **Find a post created from Studio**
  - [ ] Verify badge shows "Studio" or appropriate icon
- [ ] **Find a post created from Blend**
  - [ ] Verify badge shows "Blend" or appropriate icon
- [ ] **Find a post created from Edit**
  - [ ] Verify badge shows "Edit" or appropriate icon
- [ ] **Find a post created from Upscale**
  - [ ] Verify badge shows "Upscale" or appropriate icon
- [ ] **Find a post created from Artie**
  - [ ] Verify badge shows "Artie" or appropriate icon

### Sorting

- [ ] **Click "Trending"**
  - [ ] Posts sorted by likes_count DESC
- [ ] **Click "Recent"**
  - [ ] Posts sorted by created_at DESC
- [ ] **Click "Most Discussed"**
  - [ ] Posts sorted by comments_count DESC

### Infinite Scroll

- [ ] **Scroll to bottom of page**
- [ ] **Verify next page loads automatically**
- [ ] **Verify loading indicator shows**
- [ ] **Verify no duplicate posts**

### Like Functionality

- [ ] **Click like button on a post**
  - [ ] Button changes to "liked" state (filled heart)
  - [ ] Like count increments by 1
- [ ] **Click like button again (unlike)**
  - [ ] Button changes to "unliked" state (outline heart)
  - [ ] Like count decrements by 1
- [ ] **Refresh page**
  - [ ] Like state persists

### Comment Functionality

- [ ] **Click comment button on a post**
  - [ ] Comment section expands
  - [ ] Existing comments load (if any)
- [ ] **Type a comment** "Great work!"
- [ ] **Click "Post Comment"**
  - [ ] Comment appears in list
  - [ ] Comment count increments by 1
- [ ] **Refresh page**
  - [ ] Comment persists

### View Tracking

- [ ] **Open a post detail** (if implemented)
  - [ ] Verify view count increments
- [ ] **Refresh page**
  - [ ] Verify view count does NOT increment again (24hr debounce)
- [ ] **Open in incognito window**
  - [ ] Verify view count increments (different session)

---

## PHASE 5: TOOL INTEGRATION TESTING

### Remix Flow

- [ ] **Find a post with a prompt** (e.g., from Studio)
- [ ] **Click "Remix" button**
- [ ] **Verify:**
  - [ ] Redirects to Studio (or appropriate tool)
  - [ ] Prompt is pre-filled
  - [ ] Original image is loaded as reference (optional)
- [ ] **Generate a new image**
- [ ] **Share to Community**
- [ ] **Verify in database:**
  - [ ] `remix_source_id` is set to original post ID
  - [ ] `original_author_id` is set to original author ID

### Open in Studio Flow

- [ ] **Find any community post**
- [ ] **Click "Open in Studio" button**
- [ ] **Verify:**
  - [ ] Redirects to Studio
  - [ ] Image is loaded as reference
  - [ ] Prompt is pre-filled (if available)

### Edit Flow

- [ ] **Find any community post**
- [ ] **Click "Edit" button** (if implemented)
- [ ] **Verify:**
  - [ ] Opens Edit modal
  - [ ] Image is loaded

### Upscale Flow

- [ ] **Find any community post**
- [ ] **Click "Upscale" button** (if implemented)
- [ ] **Verify:**
  - [ ] Opens Upscale modal
  - [ ] Image is loaded

### Blend Flow

- [ ] **Find any community post**
- [ ] **Click "Blend" button** (if implemented)
- [ ] **Verify:**
  - [ ] Opens Blend modal
  - [ ] Image is loaded as one source

### Discuss with Artie

- [ ] **Find any community post**
- [ ] **Click "Discuss with Artie" button**
- [ ] **Verify:**
  - [ ] Artie chat opens
  - [ ] Image is added to conversation
  - [ ] Artie responds with context about the image
  - [ ] **If post has tool metadata:**
    - [ ] Artie mentions the tool used
    - [ ] Example: "This was created using the Blend tool..."

---

## PHASE 6: ARTIE INTEGRATION TESTING

### Artie System Prompt

- [ ] **Open Artie chat**
- [ ] **Ask:** "What is the Community?"
- [ ] **Verify Artie responds** with information about the Community feature
- [ ] **Ask:** "Show me trending posts"
- [ ] **Verify Artie** can navigate to Community or show trending posts

### Artie Tool Awareness

- [ ] **Open a community post created with Blend**
- [ ] **Click "Discuss with Artie"**
- [ ] **Ask:** "How was this made?"
- [ ] **Verify Artie responds** with tool information
  - [ ] Example: "This image was created using the Blend tool with a 60/40 ratio."

### Artie Remix Suggestions

- [ ] **Open a community post**
- [ ] **Click "Discuss with Artie"**
- [ ] **Ask:** "Can I remix this?"
- [ ] **Verify Artie responds** with remix instructions
  - [ ] Example: "Yes! Click the Remix button to open this in Studio with the original prompt."

---

## PHASE 7: LANDING PAGE TESTING

### Featured Community Section

- [ ] **Navigate to** `/` (landing page)
- [ ] **Scroll to Featured Community section**
- [ ] **Verify:**
  - [ ] Shows 6-8 featured posts
  - [ ] Posts are marked as `is_featured = true` in database
  - [ ] Images load correctly
  - [ ] "Explore Community" CTA button present
- [ ] **Click "Explore Community"**
  - [ ] Redirects to `/community`

### Hero CTA

- [ ] **Check landing page hero section**
- [ ] **Verify "Explore Community" CTA** is present
- [ ] **Click CTA**
  - [ ] Redirects to `/community`

---

## PHASE 8: PERFORMANCE TESTING

### Grid Load Time

- [ ] **Navigate to** `/community`
- [ ] **Measure time to first paint** (use DevTools Performance tab)
  - [ ] Target: < 2 seconds
- [ ] **Verify images load progressively** (lazy loading)

### Thumbnail Usage

- [ ] **Inspect network requests** in DevTools
- [ ] **Verify:**
  - [ ] Grid uses `thumbnail_url` (smaller images)
  - [ ] Detail view uses full `image_url`
  - [ ] Thumbnails are WebP format
  - [ ] Thumbnails are ~400px wide

### Infinite Scroll Performance

- [ ] **Scroll through 50+ posts**
- [ ] **Verify:**
  - [ ] No lag or jank
  - [ ] Smooth scrolling
  - [ ] Images load progressively

### Prefetching

- [ ] **Hover over a post card**
- [ ] **Check network tab**
  - [ ] Verify full image is prefetched (optional feature)

### Caching

- [ ] **Navigate to Community**
- [ ] **Navigate away**
- [ ] **Navigate back to Community**
- [ ] **Verify:**
  - [ ] Posts load instantly (from cache)
  - [ ] No duplicate network requests

---

## MOBILE TESTING

### Responsive Layout

- [ ] **Open Community on mobile** (or use DevTools device emulation)
- [ ] **Verify:**
  - [ ] Masonry grid adapts to single column
  - [ ] Images scale correctly
  - [ ] Buttons are tap-friendly (min 44px)
  - [ ] No horizontal scroll

### Mobile Actions

- [ ] **Tap like button**
  - [ ] Works correctly
- [ ] **Tap comment button**
  - [ ] Comment section expands
  - [ ] Keyboard opens
- [ ] **Type and submit comment**
  - [ ] Works correctly
- [ ] **Tap "Discuss with Artie"**
  - [ ] Artie chat opens

### Mobile Share Dialog

- [ ] **Generate an image on mobile**
- [ ] **Click "Share to Community"**
- [ ] **Verify:**
  - [ ] Drawer opens (not dialog)
  - [ ] Form is usable
  - [ ] Submit works

---

## SECURITY TESTING

### RLS Policies

- [ ] **Sign out**
- [ ] **Navigate to** `/community`
- [ ] **Verify:**
  - [ ] Can view posts (public read)
  - [ ] Cannot like (must be signed in)
  - [ ] Cannot comment (must be signed in)

- [ ] **Sign in as User A**
- [ ] **Create a post**
- [ ] **Sign in as User B**
- [ ] **Try to edit User A's post** (via API)
  - [ ] Should fail (RLS blocks)
- [ ] **Try to delete User A's post** (via API)
  - [ ] Should fail (RLS blocks)

- [ ] **Sign in as User A**
- [ ] **Edit own post**
  - [ ] Should succeed
- [ ] **Delete own post**
  - [ ] Should succeed

### SQL Injection

- [ ] **Try to inject SQL in caption field**
  - [ ] Example: `'; DROP TABLE community_posts; --`
  - [ ] Verify: Treated as plain text, no SQL execution

### XSS

- [ ] **Try to inject script in caption field**
  - [ ] Example: `<script>alert('XSS')</script>`
  - [ ] Verify: Rendered as plain text, no script execution

---

## EDGE CASES

### Empty States

- [ ] **Navigate to Community with no posts**
  - [ ] Verify empty state message shows
  - [ ] Verify CTA to create first post

### Long Prompts

- [ ] **Create a post with a very long prompt** (500+ characters)
  - [ ] Verify prompt is truncated in grid view
  - [ ] Verify full prompt shows in detail view or on expand

### Missing Metadata

- [ ] **Create a post without prompt**
  - [ ] Verify post still displays correctly
  - [ ] Verify no errors

### Deleted Posts

- [ ] **Create a post**
- [ ] **Delete the post**
- [ ] **Verify:**
  - [ ] Post removed from feed
  - [ ] Comments cascade deleted
  - [ ] Likes cascade deleted

### Network Errors

- [ ] **Simulate offline mode** (DevTools)
- [ ] **Try to like a post**
  - [ ] Verify error message shows
  - [ ] Verify UI doesn't break

---

## ACCESSIBILITY TESTING

### Keyboard Navigation

- [ ] **Navigate Community with Tab key**
  - [ ] All interactive elements focusable
  - [ ] Focus order is logical
  - [ ] Focus visible (outline)

### Screen Reader

- [ ] **Use screen reader** (VoiceOver, NVDA, etc.)
  - [ ] Post cards announced correctly
  - [ ] Buttons have descriptive labels
  - [ ] Images have alt text

### Color Contrast

- [ ] **Check color contrast** (use DevTools Lighthouse)
  - [ ] All text meets WCAG AA standards (4.5:1)

---

## BROWSER COMPATIBILITY

- [ ] **Chrome** (latest)
  - [ ] All features work
- [ ] **Firefox** (latest)
  - [ ] All features work
- [ ] **Safari** (latest)
  - [ ] All features work
- [ ] **Edge** (latest)
  - [ ] All features work
- [ ] **Mobile Safari** (iOS)
  - [ ] All features work
- [ ] **Mobile Chrome** (Android)
  - [ ] All features work

---

## REGRESSION TESTING

### Existing Features

- [ ] **Studio** still works
- [ ] **Edit** still works
- [ ] **Blend** still works
- [ ] **Upscale** still works
- [ ] **Artie** still works
- [ ] **My Projects** still works
- [ ] **Settings** still works
- [ ] **Auth** still works

### No Console Errors

- [ ] **Open DevTools Console**
- [ ] **Navigate through app**
- [ ] **Verify no errors** (warnings are OK)

---

## POST-DEPLOYMENT MONITORING

### Day 1

- [ ] **Check error logs** (Supabase, Sentry, etc.)
  - [ ] No critical errors
- [ ] **Check database**
  - [ ] Posts being created correctly
  - [ ] Metadata being saved
- [ ] **Check analytics**
  - [ ] Users engaging with Community
  - [ ] Share rate from tools

### Week 1

- [ ] **Review user feedback**
  - [ ] Any confusion about features?
  - [ ] Any bugs reported?
- [ ] **Check performance metrics**
  - [ ] Page load times acceptable?
  - [ ] Any slow queries?
- [ ] **Review moderation queue**
  - [ ] Any inappropriate content?

---

## SIGN-OFF

### Developer Sign-Off

- [ ] All tests passed
- [ ] No critical bugs
- [ ] Code reviewed
- [ ] Documentation updated

**Developer:** ________________  
**Date:** ________________

### Product Sign-Off

- [ ] Features meet requirements
- [ ] UX is acceptable
- [ ] Ready for production

**Product Owner:** ________________  
**Date:** ________________

---

## NOTES

Use this section to document any issues found during testing:

```
Issue 1: [Description]
Status: [Fixed / Pending / Won't Fix]

Issue 2: [Description]
Status: [Fixed / Pending / Won't Fix]

...
```

---

**END OF CHECKLIST**
