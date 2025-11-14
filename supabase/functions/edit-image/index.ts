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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[EDIT-IMAGE] No authorization header");
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
      console.error("[EDIT-IMAGE] Unable to resolve user from token", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid session" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    console.log("[EDIT-IMAGE] Authenticated user:", userId);

    // Check feature access
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

    const accessResult = await accessResponse.json();
    
    if (!accessResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: accessResult.reason || "Access denied",
          upgrade_required: accessResult.upgrade_required || false,
          tier: accessResult.tier
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[EDIT-IMAGE] Access granted");

    // Parse request body
    const { imageUrl, instruction, quality = 'auto', size = '1024x1024', mask, region } = await req.json();
    
    // Validate inputs
    if (!imageUrl) {
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

    console.log("[EDIT-IMAGE] Request:", { 
      imageUrl: imageUrl.slice(0, 50), 
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
      console.log("[EDIT-IMAGE] Converted filename to URL:", fullImageUrl);
    }

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("[EDIT-IMAGE] LOVABLE_API_KEY not configured");
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
    console.log("[EDIT-IMAGE] Calling Lovable AI Gateway for image editing...");
    const aiResponse = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${trimmedInstruction}. Generate with aspect ratio ${aspectRatio}.${region ? ` Apply changes to the selected region only.` : ''}${mask ? ` Use the provided mask to guide the editing.` : ''}`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: fullImageUrl
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        }),
      },
      { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 60000 }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[EDIT-IMAGE] Lovable AI error:", aiResponse.status, errorText);
      
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
        JSON.stringify({ error: "Failed to edit image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("[EDIT-IMAGE] AI response received:", { hasImages: !!aiData.choices?.[0]?.message?.images });

    // Extract edited image
    const editedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      console.error("[EDIT-IMAGE] No image in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Failed to edit image: No image data returned" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[EDIT-IMAGE] Image edited successfully, base64 length:", editedImageUrl.length);

    // Upload to storage
    let finalImageUrl = editedImageUrl;
    let assetData = null;

    try {
      // Extract base64 data
      const base64Data = editedImageUrl.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage
      const fileName = `${userId}/${Date.now()}-edited.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error("[EDIT-IMAGE] Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('generated-images')
        .getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
      console.log("[EDIT-IMAGE] Image uploaded to storage:", finalImageUrl);

      // Save metadata to database
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          action: 'edit',
          image_url: finalImageUrl,
          prompt: trimmedInstruction,
          source_urls: [fullImageUrl.slice(0, 100)],
          params: {
            quality,
            size,
            operation: 'edit'
          },
          analysis_data: {
            source_image: fullImageUrl.slice(0, 100),
            generation_params: { quality, size },
            edited_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (assetError) {
        console.error("[EDIT-IMAGE] Database save error:", assetError);
        throw assetError;
      }

      assetData = savedAsset;
      console.log("[EDIT-IMAGE] Saved to database:", assetData.id);
    } catch (error) {
      console.error("[EDIT-IMAGE] Failed to save image:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        image: finalImageUrl,
        assetId: assetData?.id,
        message: "Image edited successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[EDIT-IMAGE] Error in edit-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
