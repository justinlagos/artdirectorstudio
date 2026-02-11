import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchWithRetry } from '../_shared/retry.ts';
import { callProvider, getDefaultProvider } from '../_shared/providerClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID?.() || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] Edit image request received`);

    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error(`[${requestId}] Unable to resolve user from token:`, userError?.message || 'No user data');
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid session" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`[${requestId}] Authenticated user: ${userId}`);

    // Check feature access
    try {
      const accessResponse = await fetchWithRetry(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'edit_image' }),
        },
        { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 10000, timeoutMs: 10000 }
      );

      if (!accessResponse.ok) {
        const accessError = await accessResponse.text();
        console.error(`[${requestId}] Feature access check failed:`, accessResponse.status, accessError);
        return new Response(
          JSON.stringify({ error: "Feature access check failed. Please try again." }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accessResult = await accessResponse.json();

      if (!accessResult.allowed) {
        console.log(`[${requestId}] Access denied:`, accessResult.reason);
        return new Response(
          JSON.stringify({
            error: accessResult.reason || "Access denied",
            upgrade_required: accessResult.upgrade_required || false,
            tier: accessResult.tier
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (accessError) {
      console.error(`[${requestId}] Feature access check error:`, accessError);
      return new Response(
        JSON.stringify({ error: "Failed to verify feature access. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Access granted`);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body. Please check your input." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, instruction, quality = 'auto', size = '1024x1024', mask, region } = requestBody;

    // Validate inputs
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return new Response(
        JSON.stringify({ error: "Editing instruction is required. Please describe what you want to change." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedInstruction = instruction.trim();

    if (trimmedInstruction.length < 3) {
      return new Response(
        JSON.stringify({ error: "Instruction must be at least 3 characters. Please provide a clear description of the changes you want." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedInstruction.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Instruction too long. Maximum 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Request validated:`, {
      imageUrl: imageUrl.substring(0, 50) + '...',
      instructionLength: trimmedInstruction.length,
      instruction: trimmedInstruction.substring(0, 100),
      hasMask: !!mask,
      hasRegion: !!region
    });

    // Convert filename to full URL if needed
    let fullImageUrl = imageUrl;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
      // It's a filename, construct the full Supabase Storage URL
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      fullImageUrl = `${supabaseUrl}/storage/v1/object/public/generated-images/${imageUrl}`;
      console.log(`[${requestId}] Converted filename to URL: ${fullImageUrl.substring(0, 100)}...`);
    }

    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      console.error(`[${requestId}] ${provider === 'gemini' ? 'GOOGLE_AI_API_KEY' : 'OPENAI_API_KEY'} not configured`);
      return new Response(
        JSON.stringify({ error: "AI service not configured. Set GOOGLE_AI_API_KEY (or OPENAI_API_KEY) in Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse size dimensions for aspect ratio
    let aspectRatio = '1:1';
    if (size === '1536x1024') {
      aspectRatio = '3:2';
    } else if (size === '1024x1536') {
      aspectRatio = '2:3';
    }

    console.log(`[${requestId}] Calling ${provider} for image editing...`);

    // Build instruction with region/mask context
    let enhancedInstruction = trimmedInstruction;
    if (region && typeof region === 'object' && region.x !== undefined) {
      // Include region coordinates in instruction for better AI understanding
      enhancedInstruction = `${trimmedInstruction} Apply this change ONLY to the rectangular region starting at coordinates (${Math.round(region.x)}, ${Math.round(region.y)}) with dimensions ${Math.round(region.width)}x${Math.round(region.height)} pixels. Keep the rest of the image completely unchanged.`;
    } else if (region) {
      enhancedInstruction = `${trimmedInstruction} Apply changes to the selected region only.`;
    }
    if (mask) {
      enhancedInstruction += ` Use the provided mask to guide the editing precisely.`;
    }

    enhancedInstruction = `${enhancedInstruction} Generate with aspect ratio ${aspectRatio}.`;

    let providerResponse;
    try {
      providerResponse = await callProvider(
        {
          provider,
          action: 'edit',
          prompt: enhancedInstruction,
          image: fullImageUrl,
          options: {
            mask: mask || undefined,
            size: size || '1024x1024',
            temperature: 0.8,
            maxTokens: 2048,
          },
        },
        requestId
      );
    } catch (aiFetchError) {
      console.error(`[${requestId}] AI fetch error:`, aiFetchError);
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!providerResponse.success) {
      if (providerResponse.errorType === 'rate_limit') {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: providerResponse.error || "Image edit failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = { image: providerResponse.image };

    console.log(`[${requestId}] AI response received:`, {
      hasImage: !!aiData.image
    });

    const editedImageUrl = aiData.image;

    if (!editedImageUrl) {
      console.error(`[${requestId}] No image in AI response. Full response:`, JSON.stringify(aiData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to edit image: No image data returned from AI service" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Image extracted, format: ${editedImageUrl.startsWith('data:image/') ? 'base64' : 'url'}, length: ${editedImageUrl.length}`);

    // FIX: Validate image URL before processing
    const isValidImageUrl = (url: string): boolean => {
      if (!url || typeof url !== 'string') return false;

      try {
        // Allow data URIs and HTTPS URLs
        if (url.startsWith('data:image/')) return true;

        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;

        // Verify Supabase storage URLs or allowed external domains
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        if (url.startsWith(`${supabaseUrl}/storage/`)) return true;

        if (url.includes('storage.googleapis.com')) return true;

        return false;
      } catch {
        return false;
      }
    };

    if (!isValidImageUrl(editedImageUrl)) {
      console.error(`[${requestId}] Invalid image URL format: ${editedImageUrl.substring(0, 100)}`);
      return new Response(
        JSON.stringify({ error: "Generated image URL is invalid or from untrusted source" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to storage if it's base64, otherwise use the URL directly
    let finalImageUrl = editedImageUrl;
    let assetData = null;

    // Only process base64 images for storage upload
    if (editedImageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data
        const base64Match = editedImageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (!base64Match || !base64Match[1]) {
          throw new Error('Invalid base64 image format');
        }

        const base64Data = base64Match[1];

        // Validate base64 data
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Empty base64 data');
        }

        // Decode base64 to buffer
        let buffer;
        try {
          buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        } catch (decodeError) {
          console.error(`[${requestId}] Base64 decode error:`, decodeError);
          throw new Error('Failed to decode base64 image data');
        }

        if (!buffer || buffer.length === 0) {
          throw new Error('Decoded buffer is empty');
        }

        console.log(`[${requestId}] Decoded image buffer size: ${buffer.length} bytes`);

        // Upload to storage
        const fileName = `${userId}/${Date.now()}-edited.png`;
        console.log(`[${requestId}] Uploading to storage: ${fileName}`);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error(`[${requestId}] Storage upload error:`, uploadError.message);
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        console.log(`[${requestId}] Storage upload successful`);

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          console.error(`[${requestId}] Failed to get public URL`);
          throw new Error('Failed to get public URL for uploaded image');
        }

        finalImageUrl = urlData.publicUrl;
        console.log(`[${requestId}] Image uploaded to storage: ${finalImageUrl.substring(0, 100)}...`);
      } catch (storageError) {
        console.error(`[${requestId}] Storage processing error:`, storageError);
        // If storage fails but we have a URL, try to use it directly
        if (editedImageUrl.startsWith('http://') || editedImageUrl.startsWith('https://')) {
          console.log(`[${requestId}] Using AI-provided URL directly due to storage error`);
          finalImageUrl = editedImageUrl;
        } else {
          throw new Error(`Failed to process image: ${storageError instanceof Error ? storageError.message : 'Unknown storage error'}`);
        }
      }
    } else if (editedImageUrl.startsWith('http://') || editedImageUrl.startsWith('https://')) {
      // Image is already a URL, use it directly
      console.log(`[${requestId}] Using AI-provided URL directly: ${editedImageUrl.substring(0, 100)}...`);
      finalImageUrl = editedImageUrl;
    } else {
      console.error(`[${requestId}] Invalid image format:`, editedImageUrl.substring(0, 100));
      return new Response(
        JSON.stringify({ error: "Invalid image format returned from AI service" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save metadata to database
    try {
      console.log(`[${requestId}] Saving to database...`);
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'edit',
          image_url: finalImageUrl,
          prompt: trimmedInstruction,
          source_urls: [fullImageUrl.length > 100 ? fullImageUrl.substring(0, 100) : fullImageUrl],
          params: {
            quality,
            size,
            operation: 'edit',
            requestId
          },
          analysis_data: {
            source_image: fullImageUrl.length > 100 ? fullImageUrl.substring(0, 100) : fullImageUrl,
            generation_params: { quality, size },
            edited_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (assetError) {
        console.error(`[${requestId}] Database save error:`, assetError.message, assetError.code);
        // Don't fail the request if database save fails - the image was still edited
        console.warn(`[${requestId}] Continuing despite database error - image edit was successful`);
      } else {
        assetData = savedAsset;
        console.log(`[${requestId}] Saved to database: ${assetData.id}`);
      }
    } catch (dbError) {
      console.error(`[${requestId}] Database error:`, dbError);
      // Don't fail the request if database save fails
      console.warn(`[${requestId}] Continuing despite database error - image edit was successful`);
    }

    console.log(`[${requestId}] Edit completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        image: finalImageUrl,
        assetId: assetData?.id || null,
        message: "Image edited successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    console.error(`[${requestId}] Error in edit-image function:`, {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error
    });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
