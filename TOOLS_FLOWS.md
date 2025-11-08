# Tool Flows Documentation

## Overview
This document describes the complete data flow for each of the four core tools: Analyze, Blend, Upscale, and Batch.

---

## Architecture

### Components
```
Frontend (React)
├── Tool Dialogs (ImageBlendDialog, ImageUpscaleDialog, BatchProcessDialog)
├── ToolsModalContext (state management)
├── useFeatureAccess (access control)
└── useToolState (unified state machine)

Backend (Supabase Edge Functions)
├── analyze-image
├── blend-images
├── upscale-image
├── check-feature-access
└── _shared/
    ├── validation.ts (input validation)
    ├── retry.ts (retry logic with timeout)
    ├── errors.ts (error mapping)
    ├── idempotency.ts (cache management)
    └── thumbnails.ts (thumbnail generation)
```

### Database Tables
- `profiles`: User subscription tier, credits, daily usage
- `generated_assets`: All results (analysis, images, prompts)
- `idempotency_cache`: Prevents duplicate requests
- `credit_transactions`: Audit log of usage

### Storage Buckets
- `generated-images` (public): All result images and thumbnails

---

## 1. Analyze Flow

### Frontend → Backend
1. **User uploads image** → `AnalysisSelect` component
2. **Click "Analyze"** → Calls `check-feature-access` edge function
3. **Access granted** → Calls `analyze-image` edge function with:
   ```typescript
   {
     image: base64DataUrl,
     idempotencyKey: crypto.randomUUID()
   }
   ```

### Edge Function Processing
1. **Authentication**: Extract userId from JWT
2. **Access Check**: Call `check-feature-access`
   - Enterprise/Pro: `bypass: true` → proceed
   - Starter: Check daily limit → increment if allowed
   - Free: Check credits → decrement if available
3. **Validation**: Check file size (< 15MB) and format (JPG/PNG/WebP)
4. **Idempotency**: Check cache for existing result
5. **AI Call**: Send to Lovable AI Gateway
   ```typescript
   POST https://ai.gateway.lovable.dev/v1/chat/completions
   {
     model: "google/gemini-2.5-flash-image-preview",
     messages: [{
       role: "user",
       content: [
         { type: "text", text: analysisPrompt },
         { type: "image_url", image_url: { url: imageDataUrl }}
       ]
     }]
   }
   ```
6. **Response Extraction**: Parse AI response for analysis JSON
7. **Cache**: Store in `idempotency_cache` for 1 hour
8. **Return**: `{ analysis, regeneratedPrompt, cached: false }`

### Frontend Result Handling
1. **Instant Display**: Set result immediately in state
2. **Background Save**: Fire-and-forget DB write
   ```typescript
   EdgeRuntime.waitUntil(
     supabase.from('generated_assets').insert({
       user_id,
       type: 'analysis',
       analysis_data: result,
       prompt: regeneratedPrompt,
       params: { action: 'analyze' }
     })
   )
   ```
3. **UI Update**: Show analysis view with live prompt editor
4. **"Generate in Studio"**: Opens Studio dialog with:
   ```typescript
   {
     prompt: regeneratedPrompt,
     analysisData: result.analysis,
     mode: 'generate'
   }
   ```

### Error Handling
- **429 Rate Limit**: Retry once after 2s, then show "Rate limit exceeded. Please wait."
- **402 Credits**: Show "Credits exhausted. Please add credits."
- **500 Server**: Show "This did not complete. Try again or adjust inputs."
- **Timeout (45s)**: Abort request, show retry button

---

## 2. Blend Flow

### Frontend → Backend
1. **User uploads 2-4 images** → `ImageBlendDialog`
2. **Enter blend instruction** → Text input
3. **Click "Blend"** → Calls `check-feature-access`
4. **Access granted** → Calls `blend-images` with:
   ```typescript
   {
     images: [base64Url1, base64Url2, ...],
     instruction: "Your blend instruction",
     idempotencyKey: crypto.randomUUID()
   }
   ```

### Edge Function Processing
1. **Authentication**: Extract userId
2. **Access Check**: Same as Analyze
3. **Validation**: 
   - Count: 2-4 images
   - Each image < 15MB
   - Format: JPG/PNG/WebP
4. **Idempotency**: Check cache
5. **AI Call**: Lovable AI Gateway with all images
   ```typescript
   {
     model: "google/gemini-2.5-flash-image-preview",
     messages: [{
       role: "user",
       content: [
         { type: "text", text: enhancedInstruction },
         ...images.map(img => ({ 
           type: "image_url", 
           image_url: { url: img } 
         }))
       ]
     }],
     modalities: ["image", "text"]
   }
   ```
6. **Extract**: Get blended image from `response.choices[0].message.images[0].image_url.url`
7. **Return**: `{ image: blendedUrl, thumbnail: blendedUrl }`

### Frontend Result Handling
1. **Instant Display**: Show blended image immediately
2. **Background Save**:
   ```typescript
   supabase.from('generated_assets').insert({
     user_id,
     type: 'image',
     image_url: publicUrl,
     prompt: instruction,
     source_urls: originalImages,
     params: { action: 'blend', imageCount: images.length }
   })
   ```
3. **"Generate in Studio"**: Opens Studio with:
   ```typescript
   {
     prompt: `Variation of blended ${imageCount} images`,
     referenceImage: blendedUrl,
     mode: 'variation'
   }
   ```

---

## 3. Upscale Flow

### Frontend → Backend
1. **User uploads image** → `ImageUpscaleDialog`
2. **Select target size** → 1536×1536 or 2048×2048
3. **Click "Upscale"** → Calls `check-feature-access`
4. **Access granted** → Calls `upscale-image` with:
   ```typescript
   {
     image: base64Url,
     targetSize: "2048x2048",
     idempotencyKey: crypto.randomUUID()
   }
   ```

### Edge Function Processing
1. **Authentication**: Extract userId
2. **Access Check**: Same as Analyze
3. **Validation**: File size and format
4. **Idempotency**: Check cache
5. **AI Call**: Lovable AI Gateway with upscale prompt
   ```typescript
   {
     model: "google/gemini-2.5-flash-image-preview",
     messages: [{
       role: "user",
       content: [
         { 
           type: "text", 
           text: "Upscale to ultra high resolution (2048×2048)..." 
         },
         { type: "image_url", image_url: { url: image }}
       ]
     }],
     modalities: ["image", "text"]
   }
   ```
6. **Return**: `{ image: upscaledUrl, thumbnail: upscaledUrl }`

### Frontend Result Handling
1. **Instant Display**: Show upscaled image
2. **Background Save**:
   ```typescript
   supabase.from('generated_assets').insert({
     user_id,
     type: 'image',
     image_url: upscaledUrl,
     source_urls: [originalUrl],
     params: { action: 'upscale', targetSize }
   })
   ```
3. **Before/After**: Show slider with original vs upscaled
4. **"Generate in Studio"**:
   ```typescript
   {
     prompt: `Variation of upscaled ${targetSize} image`,
     referenceImage: upscaledUrl,
     mode: 'variation'
   }
   ```

---

## 4. Batch Flow

### Frontend Processing (Sequential)
1. **User uploads 1-10 images** → `BatchProcessDialog`
2. **Select operation** → "Analyze All" or "Upscale All"
3. **Click "Start Batch"** → Process queue sequentially

### Per-Item Processing
For each image in queue:
1. **Set status**: `processing`
2. **Access Check**: Call `check-feature-access` (deducts per item)
3. **Process**: Call appropriate tool function
   - Analyze: `analyze-image`
   - Upscale: `upscale-image`
4. **Save**: Write to `generated_assets` with `params.batchItem = true`
5. **Update UI**: Set status to `completed` or `failed`
6. **Delay**: 500ms between items

### Pause/Resume
- **Pause**: Set `isPaused = true`, stop after current item
- **Resume**: Set `isPaused = false`, continue from `currentIndex`
- **State**: Maintained in component, not persisted

### Batch Results
- **Filter**: History page shows batch items via `params.batchItem === true`
- **Badge**: Display "Batch" badge on these items
- **"View All"**: Navigates to History with batch filter active

---

## Access Control Flow

### check-feature-access Edge Function
```typescript
// Input: { action: 'blend_images' | 'upscale_image' | 'analyze_image' }

1. Authenticate user via JWT
2. Fetch profile: subscription_tier, is_pro, free_credits, daily_usage, daily_limit
3. Check tier:

   Enterprise/Pro:
   → return { allowed: true, bypass: true, tier, reason: "Unlimited" }

   Starter:
   → if daily_usage >= daily_limit:
      return { allowed: false, bypass: false, upgrade_required: true }
   → else:
      increment daily_usage
      return { allowed: true, bypass: false, remaining: limit - usage }

   Free:
   → if free_credits > 0:
      decrement free_credits
      return { allowed: true, bypass: false, remaining: credits - 1 }
   → else:
      return { allowed: false, bypass: false, upgrade_required: true }
```

### Frontend Bypass Logic
```typescript
const access = await checkFeatureAccess();

if (!access.allowed) {
  if (access.requiresUpgrade) {
    showUpgradeDialog(access.tier, access.reason);
  } else {
    toast.error(access.reason);
  }
  return;
}

// If bypass === true (Pro/Enterprise), skip all credit UI
if (access.bypass) {
  // No "costs X credits" messaging
  // Proceed without deduction
}
```

---

## Error Message Mapping

### AI Gateway Errors
| Status | User Message |
|--------|-------------|
| 429 | "Rate limit exceeded. Please wait a moment and try again." |
| 402 | "Credits exhausted. Please add credits to your workspace to continue." |
| 500-599 | "This did not complete. Try again or adjust inputs." |
| Other | "Processing failed. Please try again." |

### Validation Errors
| Error | User Message |
|-------|-------------|
| File too large | "File is too large. Max 15 MB." |
| Invalid format | "Image format not supported. Use JPG or PNG." |
| Invalid count | "Please select between X and Y images." |
| Missing input | "Please select an image" |

---

## Logging Standards

### Success Log
```json
{
  "requestId": "uuid",
  "action": "blend_success",
  "userId": "user-uuid",
  "provider": "lovable-ai-gateway",
  "providerStatus": 200,
  "duration_ms": 24300,
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### Error Log
```json
{
  "requestId": "uuid",
  "action": "api_error",
  "userId": "user-uuid",
  "provider": "lovable-ai-gateway",
  "providerStatus": 429,
  "errorCode": "RATE_LIMIT",
  "duration_ms": 5200,
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

## Performance Optimization

### Idempotency Cache
- **TTL**: 1 hour
- **Key**: `{function}-{userId}-{hash(inputs)}`
- **Storage**: `idempotency_cache` table
- **Cleanup**: Automatic via `expires_at` column

### Retry Strategy
- **Max retries**: 1
- **Delay**: 2 seconds
- **Timeout**: 45 seconds
- **Abort**: AbortController on timeout

### Thumbnail Strategy (Future)
1. Generate 1024px thumbnail in edge function
2. Store in `thumbnails/` bucket path
3. Return both full-res and thumbnail URLs
4. UI uses thumbnail for lists, full-res on demand

---

## Security Checklist

- [x] JWT authentication on all edge functions
- [x] RLS policies on `generated_assets` table
- [x] Input validation (file size, format, count)
- [x] Rate limiting via Lovable AI Gateway
- [x] Access control per tier (Pro bypass, Starter limit, Free credits)
- [x] No raw SQL execution in edge functions
- [x] CORS headers properly configured
- [x] Service role key only in edge functions, never in frontend
