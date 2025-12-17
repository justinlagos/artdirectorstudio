# PHASE 3 TESTING GUIDE

## 🚀 Dev Server Running

Your app is now running at: **http://localhost:5173/**

---

## 🧪 TEST 1: Studio Tool Metadata

### Steps:
1. **Open your browser** and go to: http://localhost:5173/
2. **Sign in** (if not already signed in)
3. **Click "Studio"** or navigate to the Studio tool
4. **Enter a prompt**, for example:
   ```
   A futuristic cityscape at sunset with flying cars
   ```
5. **Select options:**
   - Aspect Ratio: `16:9`
   - Quality: `High`
   - Background: `Auto`
6. **Click "Generate"**
7. **Wait for image to generate** (~10-15 seconds)
8. **Click "Share to Community"** button
9. **Add a caption** (optional), for example:
   ```
   My first AI-generated cityscape!
   ```
10. **Click "Share to Community"** to submit

### Expected Result:
- ✅ Toast notification: "Shared with the community!"
- ✅ Option to "View Community"

---

## 🔍 VERIFY IN DATABASE

### Option 1: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/gpyxglipegxukulmqykv/editor
2. Click on **Table Editor**
3. Select **`community_posts`** table
4. Find your most recent post (top row)
5. **Check these columns:**
   - ✅ `prompt` = "A futuristic cityscape at sunset with flying cars"
   - ✅ `tool_used` = "studio"
   - ✅ `params` = JSON object with quality, aspectRatio, background
   - ✅ `aspect_ratio` = "16:9"
   - ✅ `model_version` = "google/gemini-3-pro-image-preview"

### Option 2: SQL Query

1. Go to: https://supabase.com/dashboard/project/gpyxglipegxukulmqykv/sql
2. Run this query:

```sql
SELECT 
  id,
  caption,
  prompt,
  tool_used,
  params,
  aspect_ratio,
  model_version,
  created_at
FROM community_posts
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Output:

```json
{
  "id": "uuid-here",
  "caption": "My first AI-generated cityscape!",
  "prompt": "A futuristic cityscape at sunset with flying cars",
  "tool_used": "studio",
  "params": {
    "quality": "high",
    "aspectRatio": "16:9",
    "background": "auto",
    "continuationStrength": 1.0
  },
  "aspect_ratio": "16:9",
  "model_version": "google/gemini-3-pro-image-preview",
  "created_at": "2025-12-04T11:30:00.000Z"
}
```

---

## ✅ SUCCESS CRITERIA

If you see all of the following, **Phase 3 (Studio) is working correctly:**

- ✅ `prompt` field is populated with your prompt
- ✅ `tool_used` = "studio"
- ✅ `params` is a JSON object (not null)
- ✅ `params.quality` matches what you selected
- ✅ `params.aspectRatio` matches what you selected
- ✅ `aspect_ratio` matches what you selected
- ✅ `model_version` is set

---

## ❌ TROUBLESHOOTING

### Issue: Metadata fields are NULL

**Possible causes:**
1. TypeScript types not regenerated
2. ShareToCommunityDialog not updated correctly
3. ImageGenerationDialog not passing props

**Fix:**
1. Check browser console for errors (F12 → Console)
2. Verify no TypeScript errors in VS Code
3. Check that ShareToCommunityDialog.tsx has the new props
4. Check that ImageGenerationDialog.tsx passes metadata

### Issue: "Share to Community" button doesn't work

**Possible causes:**
1. Not signed in
2. No image generated
3. Network error

**Fix:**
1. Ensure you're signed in
2. Wait for image to fully generate
3. Check browser console for errors

### Issue: Database query returns no results

**Possible causes:**
1. Post wasn't created
2. Wrong project ID

**Fix:**
1. Check if toast notification appeared
2. Verify you're querying the correct project: `gpyxglipegxukulmqykv`
3. Check Supabase logs for errors

---

## 📊 WHAT TO REPORT BACK

After testing, please report:

1. ✅ **Success:** "Metadata is saving correctly! Here's what I see: [screenshot or JSON]"
2. ❌ **Failure:** "Metadata is NULL. Here's the error: [error message]"
3. ⚠️ **Partial:** "Some fields work, but X is NULL"

---

## 🎯 NEXT STEPS AFTER TESTING

### If Test Passes ✅
- Continue with remaining tools (Edit, Blend, Upscale, Artie)
- Move to Phase 4 (Community Page enhancements)

### If Test Fails ❌
- Debug the issue
- Fix and retest
- Then continue

---

## 🔗 QUICK LINKS

- **App:** http://localhost:5173/
- **Supabase Dashboard:** https://supabase.com/dashboard/project/gpyxglipegxukulmqykv
- **Table Editor:** https://supabase.com/dashboard/project/gpyxglipegxukulmqykv/editor
- **SQL Editor:** https://supabase.com/dashboard/project/gpyxglipegxukulmqykv/sql

---

**Ready to test! Let me know the results.** 🚀
