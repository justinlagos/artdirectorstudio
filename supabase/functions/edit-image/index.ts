import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { fetchWithRetry } from '../_shared/retry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
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

    // Call Lovable AI Gateway with image editing
    console.log(`[${requestId}] Calling Lovable AI Gateway for image editing...`);

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

    // FIX: Build AI request with structured region parameters if supported
    const aiRequestBody: any = {
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${enhancedInstruction} Generate with aspect ratio ${aspectRatio}.`
            },
            {
              type: "image_url",
              image_url: {
                url: fullImageUrl,
                // Include structured region if available (for models that support it)
                ...(region && typeof region === 'object' && region.x !== undefined && {
                  region: {
                    x: Math.round(region.x),
                    y: Math.round(region.y),
                    width: Math.round(region.width),
                    height: Math.round(region.height)
                  }
                })
              }
            }
          ]
        }
      ],
      modalities: ["image", "text"]
    };

    // Add mask parameter if provided
    if (mask) {
      aiRequestBody.mask = mask;
    }

    console.log(`[${requestId}] AI request instruction length: ${enhancedInstruction.length}, has region: ${!!region}, has mask: ${!!mask}`);

    let aiResponse;
    try {
      aiResponse = await fetchWithRetry(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(aiRequestBody),
        },
        { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 60000 }
      );
    } catch (aiFetchError) {
      console.error(`[${requestId}] AI Gateway fetch error:`, aiFetchError);
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      let errorText = '';
      try {
        errorText = await aiResponse.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      console.error(`[${requestId}] Lovable AI error:`, aiResponse.status, errorText.substring(0, 200));

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later or contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Failed to edit image: AI service returned error ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse AI response:`, parseError);
      return new Response(
        JSON.stringify({ error: "Failed to process AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] AI response received:`, {
      hasChoices: !!aiData.choices,
      hasMessage: !!aiData.choices?.[0]?.message,
      hasImages: !!aiData.choices?.[0]?.message?.images,
      imageCount: aiData.choices?.[0]?.message?.images?.length || 0
    });

    // Extract edited image - handle multiple possible response structures
    let editedImageUrl = null;

    // Try primary structure: choices[0].message.images[0].image_url.url
    if (aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      editedImageUrl = aiData.choices[0].message.images[0].image_url.url;
    }
    // Try alternative structure: choices[0].message.content (if it's an image)
    else if (aiData.choices?.[0]?.message?.content) {
      const content = aiData.choices[0].message.content;
      if (typeof content === 'string' && content.startsWith('data:image/')) {
        editedImageUrl = content;
      } else if (Array.isArray(content)) {
        const imageContent = content.find(item => item.type === 'image_url' || item.type === 'image');
        if (imageContent?.image_url?.url) {
          editedImageUrl = imageContent.image_url.url;
        } else if (imageContent?.url) {
          editedImageUrl = imageContent.url;
        }
      }
    }
    // Try direct image field
    else if (aiData.image) {
      editedImageUrl = aiData.image;
    }

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

        // Allow Lovable AI gateway and Google storage URLs
        if (url.includes('ai.gateway.lovable.dev') || url.includes('storage.googleapis.com')) {
          return true;
        }

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
