import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Extract and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("Invalid JWT format");
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      console.error("No user ID in JWT");
      return new Response(
        JSON.stringify({ error: "Invalid token: no user ID" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Authenticated user:", userId);

    // Check feature access before processing
    const accessResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-feature-access`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'generate_image' }),
    });

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

    console.log("Access granted:", accessResult);

    // Parse request body
    const { prompt, quality = 'auto', size = '1024x1024', background = 'auto' } = await req.json();
    
    // Parse size dimensions
    let aspectRatio = '1:1'; // Default square
    if (size === '1536x1024') {
      aspectRatio = '3:2'; // Landscape
    } else if (size === '1024x1536') {
      aspectRatio = '2:3'; // Portrait
    }
    
    // Validate prompt
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Prompt must be a string" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length < 3) {
      return new Response(
        JSON.stringify({ error: "Prompt too short. Minimum 3 characters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long. Maximum 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Generation request:", { promptLength: prompt.length, quality, size, background });

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway with Nano banana model
    console.log("Calling Lovable AI Gateway...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Generate an image with aspect ratio ${aspectRatio}. ${prompt}`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
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
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", { hasImages: !!aiData.choices?.[0]?.message?.images });

    // Extract generated image
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Failed to generate image: No image data returned" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Image generated successfully, base64 length:", generatedImageUrl.length);

    // Initialize Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Upload to storage instead of saving base64 to database
    let finalImageUrl = generatedImageUrl;
    let assetData = null;

    try {
      // Extract base64 data
      const base64Data = generatedImageUrl.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage
      const fileName = `${userId}/${Date.now()}-generated.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('generated-images')
        .getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
      console.log("Image uploaded to storage:", finalImageUrl);

      // Save metadata to database
      const { data: savedAsset, error: assetError } = await supabaseAdmin
        .from('generated_assets')
        .insert({
          user_id: userId,
          type: 'image',
          prompt: prompt,
          image_url: finalImageUrl,
          analysis_data: {
            generation_params: { quality, size, background },
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (assetError) {
        console.error("Database save error:", assetError);
        throw assetError;
      }

      assetData = savedAsset;
      console.log("Saved to database:", assetData.id);
    } catch (error) {
      console.error("Failed to save image:", error);
      // Return base64 as fallback but log error
      finalImageUrl = generatedImageUrl;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        image: finalImageUrl,
        assetId: assetData?.id,
        message: "Image generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});