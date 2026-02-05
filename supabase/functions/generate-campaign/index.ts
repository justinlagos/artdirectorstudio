import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { fetchWithRetry } from '../_shared/retry.ts';
import { createErrorResponse } from '../_shared/errors.ts';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const { campaignId, masterPrompt, masterImageUrl, formats, brandKitId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand kit if selected
    let brandKit = null;
    if (brandKitId) {
      const { data } = await supabaseAdmin
        .from('brand_kits')
        .select('*')
        .eq('id', brandKitId)
        .eq('user_id', userId)
        .single();
      brandKit = data;
    }

    const results: Record<string, string[]> = {};

    // Generate for each selected format
    for (const format of formats) {
      if (!format.selected) continue;

      const formatResults: string[] = [];

      for (let i = 0; i < format.variations; i++) {
        // Adapt prompt for format
        let adaptedPrompt = masterPrompt;
        
        // Format-specific adaptations
        if (format.id.includes('story') || format.id.includes('reel')) {
          adaptedPrompt += ' Optimized for vertical mobile viewing with text-safe zones.';
        } else if (format.id.includes('banner') || format.id.includes('cover')) {
          adaptedPrompt += ' Optimized for wide horizontal format, suitable for header/banner use.';
        } else if (format.id.includes('post')) {
          adaptedPrompt += ' Optimized for social media feed viewing.';
        }

        // Add brand kit colors if available
        if (brandKit?.color_palette && brandKit.color_palette.length > 0) {
          const colors = brandKit.color_palette.map((c: any) => c.hex).join(', ');
          adaptedPrompt += ` Use brand colors: ${colors}.`;
        }

        // Call generate-image function for each variation
        const generateResponse = await fetchWithRetry(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-image`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: adaptedPrompt,
              quality: 'high',
              size: format.dimensions,
              background: 'auto',
              referenceImageUrl: masterImageUrl,
            }),
          },
          { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, timeoutMs: 60000 }
        );

        if (generateResponse.ok) {
          const generateData = await generateResponse.json();
          if (generateData.image) {
            formatResults.push(generateData.image);
          }
        }
      }

      results[format.id] = formatResults;
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-campaign] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
