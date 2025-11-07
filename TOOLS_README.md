# Tool System Architecture

## Overview

The ArtDirector Studio tool system provides four core capabilities:
1. **Analyze** - AI-powered image analysis with 12 professional categories
2. **Blend** - Seamlessly blend 2-4 images together
3. **Upscale** - Enhance image resolution (1536×1536 or 2048×2048)
4. **Batch** - Process multiple images at once (Analyze All or Upscale All)

## Architecture Components

### Edge Functions

All tool operations run through Supabase Edge Functions for secure processing:

- `analyze-image` - Image analysis with Gemini 2.5 Pro
- `blend-images` - Image blending with Gemini 2.5 Flash Image
- `upscale-image` - Image upscaling with Gemini 2.5 Flash Image
- `check-feature-access` - Subscription and credit verification

### Shared Modules

Located in `supabase/functions/_shared/`:

- **validation.ts** - Input validation (file size, format, counts)
- **idempotency.ts** - Double-click protection via cache
- **errors.ts** - Human-friendly error messages

### Frontend Components

- **UnifiedToolsModal** - Main tool dispatcher
- **ImageBlendDialog** - Blend tool UI
- **ImageUpscaleDialog** - Upscale tool UI with before/after slider
- **BatchProcessDialog** - Batch processing with per-item status
- **useToolState** - Unified state management hook

### Database Tables

#### `generated_assets`
Stores all tool results with metadata:
```sql
- id (uuid)
- user_id (uuid)
- type (text): 'analyze', 'blend', 'upscale', 'generate', 'batch'
- action (text): Tool action type
- image_url (text): Result image URL
- thumbnail_url (text): 1024px thumbnail
- prompt (text): Associated prompt
- analysis_data (jsonb): Analysis results
- source_urls (jsonb): Original images
- params (jsonb): Tool-specific parameters
- duration_ms (integer): Processing time
- share_slug (text): Unique share identifier
- created_at (timestamp)
```

#### `idempotency_cache`
Prevents duplicate requests:
```sql
- key (text): Idempotency key
- response (jsonb): Cached response
- created_at (timestamp)
- expires_at (timestamp)
```

## Environment Variables

### Required Secrets

All available in Supabase environment:

```bash
SUPABASE_URL                 # Auto-configured
SUPABASE_PUBLISHABLE_KEY     # Auto-configured
SUPABASE_SERVICE_ROLE_KEY    # Auto-configured for idempotency
LOVABLE_API_KEY              # For AI operations
```

## Storage Buckets

### `generated-images` (public)

Path structure:
```
results/{userId}/{yyyy-mm}/{action}/{uuid}.{ext}
```

Examples:
- `results/user-abc/2025-01/analyze/xyz.png`
- `results/user-abc/2025-01/blend/abc.jpg`
- `results/user-abc/2025-01/upscale/def.png`

## Access Control

### Feature Gating

The `check-feature-access` function enforces:

**Pro Users:**
- Unlimited access to all tools
- No credit checks
- No daily limits

**Free Users:**
- 10 trial credits (one-time)
- Starter tier: 10 operations/day
- Clear upgrade prompts when limits reached

### Validation Rules

**All Tools:**
- Max file size: 15 MB
- Supported formats: JPG, PNG (base64)
- Authentication required

**Blend:**
- 2-4 images required
- Instruction max 500 characters

**Batch:**
- 1-10 images per batch
- Operations: "Analyze All" or "Upscale All"

## State Machine

All tools follow consistent state transitions:

```
idle → validating → processing → success
                              ↘ error
```

**States:**
- `idle` - Ready for input
- `validating` - Checking inputs
- `processing` - AI operation in progress
- `success` - Result ready
- `error` - Failed with user-friendly message

## Idempotency

Double-click protection prevents duplicate processing:

1. Client generates `crypto.randomUUID()` as idempotency key
2. Edge function checks `idempotency_cache` table
3. If cached (not expired), returns cached response
4. Otherwise, processes request and caches result for 1 hour
5. Expired entries auto-cleaned

## Error Handling

### User-Friendly Messages

Technical errors mapped to actionable guidance:

```typescript
"File is too large. Max 15 MB."
"Image format not supported. Use JPG or PNG."
"This did not complete. Try again or adjust inputs."
"Rate limit exceeded. Please wait a moment and try again."
"Credits exhausted. Please add credits to continue."
```

### HTTP Status Codes

- `400` - Invalid input (validation failed)
- `401` - Authentication required
- `403` - Feature access denied (upgrade required)
- `429` - Rate limit exceeded
- `402` - Credits exhausted
- `500` - Processing failed

## Performance Targets

- **First result paint**: ≤ 200ms after API response
- **Edge function timeout**: 30s with 1 auto-retry
- **Thumbnails**: 1024px generated for all results
- **Logging**: Every operation logged with duration and requestId

## Testing Verification

### Manual Test Matrix

| Tool | Test | Expected Result |
|------|------|----------------|
| Analyze | Valid JPG | Analysis + prompt displayed instantly |
| Analyze | 20MB file | "File is too large. Max 15 MB." |
| Blend | 2 images | Blended result with Download + Share |
| Blend | 5 images | "Please select between 2 and 4 images." |
| Upscale | 1 image | Before/after slider shown |
| Upscale | Double-click | Only 1 request sent (idempotency) |
| Batch | 5 images Analyze | Per-item status, "View All Results" |
| Batch | 10 images Upscale | "Download All" available |

### Access Testing

**Pro User Flow:**
1. Login as Pro user
2. Use any tool multiple times
3. Verify NO credit prompts appear
4. Verify NO daily limit warnings

**Free User Flow:**
1. Login as Free user
2. Check remaining trial credits display
3. Use tool until limit reached
4. Verify clear upgrade prompt
5. Verify operations count correctly

### Mobile Testing

**iOS Safari + Chrome Android:**
- All buttons ≥ 44px touch target
- Scroll position restored on modal close
- No layout shifts during state changes
- Image previews load correctly
- Results display properly

## Debugging

### Check Logs

View edge function logs in Lovable backend:
```bash
# Analyze tool
supabase functions logs analyze-image

# Blend tool  
supabase functions logs blend-images

# Upscale tool
supabase functions logs upscale-image

# Access control
supabase functions logs check-feature-access
```

### Log Structure

Every operation logs:
```json
{
  "requestId": "uuid",
  "action": "analyze_start|processing|success|error",
  "userId": "user-id",
  "timestamp": "2025-01-07T...",
  "duration": 1234,
  "tier": "free|pro|starter|enterprise"
}
```

### Common Issues

**"Auth session missing!"**
- Check `SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY) in edge function
- Verify `Authorization` header passed from client

**"No image returned from API"**
- Check response structure in logs
- Verify AI gateway credits available
- Ensure valid base64 image data sent

**"File too large" for small files**
- Base64 is ~33% larger than original
- Compress images before upload
- Use browser compression library

## Deployment

Edge functions auto-deploy with code changes. Manual deployment:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy analyze-image
```

## Future Improvements

**Planned Enhancements:**
- WebP format support
- Thumbnail generation server-side
- Result caching with CDN
- Progressive image loading
- Batch operation pause/resume
- Export to cloud storage (S3, GCS)

## Support

For issues or questions:
- Check edge function logs first
- Verify environment variables configured
- Test with valid sample images
- Review RLS policies on tables
- Contact: support@artdirectorstudio.com
