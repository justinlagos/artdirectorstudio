# Verification Steps - How to Test the Changes

## ✅ What's Been Fixed

1. **All generate-image calls now use new format** - Updated:
   - `src/store/studioStore.ts`
   - `src/pages/Index.tsx`
   - `src/hooks/useStreamingGeneration.ts`
   - `src/components/ArtieChat.tsx`
   - `src/components/BatchProcessDialog.tsx`

2. **Design tokens are loaded** - `src/styles/tokens.css` imported in `src/index.css`

3. **Modal components created** - Ready to use in `src/components/overlay/`

4. **Backend ready** - New contract, prompt engine, structured logging

## 🧪 How to Verify It's Working

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Generate an image
4. Look for: `[GenerationParams] Converted to backend format:`
5. Verify it shows `aspect_ratio`, `background_mode`, `quality` in the output

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "generate-image"
3. Generate an image
4. Click on the request
5. Go to "Payload" or "Request" tab
6. Verify the body contains:
   ```json
   {
     "prompt": "...",
     "aspect_ratio": "1:1",
     "background_mode": "original",
     "quality": "standard"
   }
   ```

### Step 3: Check Backend Logs
1. Go to Supabase Dashboard
2. Edge Functions → generate-image → Logs
3. Look for structured logs with:
   - `normalized_params`
   - `prompt_version: "v1.0.0"`
   - `model_used: "google/gemini-3-pro-image-preview"`

### Step 4: Check Database
1. Run this SQL in Supabase SQL Editor:
   ```sql
   SELECT 
     id,
     prompt_version,
     aspect_ratio,
     background_mode,
     quality,
     model_used,
     seed,
     width,
     height
   FROM generated_assets 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
2. Verify new columns are populated

### Step 5: Test DEBUG Mode
Add this to your browser console before generating:
```javascript
// This will be sent as a header in the next request
sessionStorage.setItem('debug-generation', 'true');
```

Or use curl:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-debug: true" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test",
    "aspect_ratio": "1:1",
    "background_mode": "original",
    "quality": "standard"
  }'
```

Should return prompt object without generating image.

## 🔍 What to Look For

### ✅ Success Indicators:
- Console shows `[GenerationParams] Converted to backend format`
- Network request has `aspect_ratio`, `background_mode`, `quality`
- Backend logs show `normalized_params` with structured data
- Database has `prompt_version` and `full_prompt_object` populated

### ❌ If Not Working:
- Check browser console for errors
- Verify `src/lib/generationParams.ts` exists
- Check all imports are correct
- Verify backend migration has been run
- Check edge functions are deployed

## 🚀 Next: Deploy Backend Changes

The frontend is ready. You need to:

1. **Run Database Migration:**
   ```bash
   supabase migration up
   ```

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy generate-image
   supabase functions deploy remove-background
   ```

3. **Verify Deployment:**
   - Check Supabase Dashboard → Edge Functions
   - All functions should show as "Active"
