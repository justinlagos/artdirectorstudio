# Testing Checklist - Backend & Frontend Changes

## Backend Changes ✅

### 1. Generation Parameters Contract
- ✅ Created `supabase/functions/_shared/generationParams.ts`
- ✅ Validates all parameters strictly
- ✅ Rejects unknown keys
- ✅ Normalizes values with defaults

**Test:** Send a request with invalid params - should get clear error

### 2. Prompt Engine
- ✅ Created `supabase/functions/_shared/promptEngine.ts`
- ✅ Versioned prompts (v1.0.0)
- ✅ Structured prompt objects stored in DB

**Test:** Check database - `full_prompt_object` should contain structured JSON

### 3. Generate Image Function
- ✅ Uses new contract
- ✅ Uses prompt engine
- ✅ Stores full metadata
- ✅ DEBUG mode available (header `x-debug: true`)

**Test:** 
- Generate an image - check console logs for structured params
- Add header `x-debug: true` - should return prompt object without generating

### 4. Background Removal
- ✅ New edge function `remove-background`
- ✅ First-class operation with metadata

**Test:** Call remove-background function with image_id

### 5. Database Schema
- ✅ Migration created: `20260124_generation_metadata_enhancement.sql`
- ✅ New columns: prompt_version, full_prompt_object, etc.

**Test:** Run migration, check generated_assets table has new columns

## Frontend Changes ✅

### 1. Design Tokens
- ✅ Created `src/styles/tokens.css`
- ✅ Imported in `src/index.css`
- ✅ Tailwind config updated

**Test:** Check browser devtools - CSS variables should be defined

### 2. Parameter Conversion
- ✅ Created `src/lib/generationParams.ts`
- ✅ Updated all call sites:
  - `src/store/studioStore.ts` ✅
  - `src/pages/Index.tsx` ✅
  - `src/hooks/useStreamingGeneration.ts` ✅
  - `src/components/ArtieChat.tsx` ✅
  - `src/components/BatchProcessDialog.tsx` ✅

**Test:** 
- Open browser network tab
- Generate an image
- Check request body has `aspect_ratio`, `background_mode`, `quality` (new format)

### 3. Modal Architecture
- ✅ Created modal components in `src/components/overlay/`
- ⚠️ Not yet integrated into ImageGenerationDialog

**Test:** Components exist but not used yet - need to refactor ImageGenerationDialog

## How to Verify Changes Are Working

### Backend Verification:
1. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → Edge Functions → generate-image
   - Look for structured logs with `normalized_params`, `prompt_version`

2. **Test DEBUG Mode:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/generate-image \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "x-debug: true" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test","aspect_ratio":"1:1","background_mode":"original","quality":"standard"}'
   ```
   Should return prompt object without generating image

3. **Check Database:**
   ```sql
   SELECT prompt_version, full_prompt_object, model_used, seed 
   FROM generated_assets 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   Should show new metadata fields populated

### Frontend Verification:
1. **Check Network Requests:**
   - Open DevTools → Network tab
   - Generate an image
   - Check request payload has:
     - `aspect_ratio` (not just `size`)
     - `background_mode` (not just `background`)
     - `quality` (normalized to "standard" or "high")

2. **Check CSS Variables:**
   - Open DevTools → Elements → :root
   - Should see `--space-*`, `--radius-*`, `--shadow-*` variables

3. **Test Parameter Changes:**
   - Change aspect ratio in UI → should see change in request
   - Change quality → should see "standard" or "high" in request
   - Change background → should see "transparent", "solid", or "original"

## Known Issues / Not Yet Implemented

1. **ImageGenerationDialog** - Still uses old modal, needs refactor to ModalShell
2. **ARtie UX** - Still verbose, needs compact rewrite
3. **Spacing Audit** - Some components still use arbitrary values
4. **Modal Integration** - ModalShell exists but not used yet

## Next Steps

1. Run database migration: `supabase migration up`
2. Deploy edge functions: `supabase functions deploy`
3. Test generation with new parameters
4. Verify backend logs show structured data
5. Incrementally refactor UI components
