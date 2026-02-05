import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
    const { imageUrl, brandKitId, prompt } = await req.json();

    if (!brandKitId) {
      return new Response(
        JSON.stringify({ consistent: true, message: 'No brand kit selected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get brand kit
    const { data: brandKit, error: brandKitError } = await supabaseAdmin
      .from('brand_kits')
      .select('*')
      .eq('id', brandKitId)
      .eq('user_id', userId)
      .single();

    if (brandKitError || !brandKit) {
      return new Response(
        JSON.stringify({ error: 'Brand kit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ consistent: true, message: 'AI service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check consistency with AI
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
            content: 'You are a brand consistency checker. Analyze if an image matches brand guidelines.',
          },
          {
            role: 'user',
            content: `Check if this generated image matches the brand guidelines:

Brand Colors: ${JSON.stringify(brandKit.color_palette || [])}
Brand Style: ${brandKit.usage_rules?.imageryStyle || 'Not specified'}
Brand Tone: ${brandKit.usage_rules?.tone || 'Not specified'}

Generated Prompt: ${prompt || 'Not provided'}
Image URL: ${imageUrl}

Return JSON:
{
  "consistent": true/false,
  "deviations": ["reason1", "reason2"],
  "score": 0-100
}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ consistent: true, message: 'Consistency check unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    return new Response(
      JSON.stringify({
        consistent: analysis.consistent !== false,
        deviations: analysis.deviations || [],
        score: analysis.score || 100,
        message: analysis.consistent !== false 
          ? 'Image matches brand guidelines'
          : `Deviations detected: ${(analysis.deviations || []).join(', ')}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-brand-consistency] Error:', error);
    return new Response(
      JSON.stringify({ consistent: true, message: 'Consistency check failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
