import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        }
      }
    );

    const { image } = await req.json();
    
    // Validate input
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image format (base64)
    if (!image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: "Invalid image format. Expected base64 data URL" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size (limit to ~10MB base64)
    if (image.length > 15000000) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum 15MB" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Calling Lovable AI for image analysis...");

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a professional image analysis AI that creates comprehensive creative briefs for image reconstruction.

Analyze the uploaded image in extreme detail across 12 professional categories. Be specific, technical, and actionable.

You MUST respond with ONLY a valid JSON object (no other text) in this exact format:
{
  "full_regeneration_prompt": "A comprehensive 150-200 word single-paragraph prompt suitable for Midjourney, DALL-E, etc.",
  "analysis": {
    "image_overview": "High-level technical description of image quality and production method",
    "subject_description": "Detailed description of the main subject including physical features, clothing, pose, expression",
    "camera_composition": "Camera type, lens, framing, angle, and compositional approach",
    "lighting": "Lighting setup, type, position, mood, and technical details",
    "color_palette": "Dominant colors, secondary colors, accents, and color relationships",
    "design_style": "Visual style, design influences, aesthetic approach",
    "texture_material": "Physical textures and materials visible in the image",
    "mood_emotion": "Emotional tone, atmosphere, and feeling conveyed",
    "background_environment": "Background description, environment type, and spatial context",
    "artistic_medium": "Production medium and optional alternative interpretations",
    "art_direction_influence": "Creative direction, visual influences, and cultural references",
    "intended_use": "Recommended applications and platforms"
  }
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image across all 12 categories with professional-level detail. Return ONLY the JSON object, no markdown formatting, no extra text.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received");
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent) {
      console.error("No content in AI response", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Raw AI content:", messageContent.substring(0, 500));

    // Parse the JSON from the AI response
    let analysisData;
    try {
      // Try multiple cleanup strategies
      let cleanContent = messageContent;
      
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      
      // Try to find JSON object in the content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      cleanContent = cleanContent.trim();
      console.log("Cleaned content:", cleanContent.substring(0, 300));
      
      analysisData = JSON.parse(cleanContent);
      
      // Validate the structure
      if (!analysisData.full_regeneration_prompt || !analysisData.analysis) {
        throw new Error("Missing full_regeneration_prompt or analysis object in response");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown parsing error";
      console.error("Failed to parse AI response:", errorMessage);
      console.error("Content sample:", messageContent.substring(0, 1000));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI analysis: " + errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload image to storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let imageUrl = null;
    try {
      // Extract base64 data
      const base64Data = image.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage
      const fileName = `${userId}/${Date.now()}-analysis.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('generated-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('generated-images')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    } catch (storageError) {
      console.error("Failed to upload image to storage:", storageError);
    }

    // Save to generated_assets
    const { error: assetError } = await supabaseAdmin
      .from('generated_assets')
      .insert({
        user_id: userId,
        type: 'analysis',
        prompt: analysisData.full_regeneration_prompt,
        analysis_data: analysisData.analysis,
        image_url: imageUrl
      });

    if (assetError) {
      console.error("Failed to save asset:", assetError);
    }

    // Return the comprehensive analysis
    return new Response(
      JSON.stringify(analysisData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in analyze-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
