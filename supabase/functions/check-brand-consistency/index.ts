import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const { chatWithProvider, getDefaultProvider } = await import('../_shared/providerClient.ts');
    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      return new Response(
        JSON.stringify({ consistent: true, message: 'AI service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userContent = `Check if this generated image matches the brand guidelines:

Brand Colors: ${JSON.stringify(brandKit.color_palette || [])}
Brand Style: ${brandKit.usage_rules?.imageryStyle || 'Not specified'}
Brand Tone: ${brandKit.usage_rules?.tone || 'Not specified'}

Generated Prompt: ${prompt || 'Not provided'}
Image URL: ${imageUrl}

Return ONLY a valid JSON object (no markdown): {"consistent": true or false, "deviations": ["reason1"], "score": 0-100}`;

    const result = await chatWithProvider(
      [
        { role: 'system', content: 'You are a brand consistency checker. Analyze if an image matches brand guidelines. Respond with JSON only.' },
        { role: 'user', content: userContent },
      ],
      { model: provider === 'gemini' ? 'gemini-2.5-pro' : 'gpt-4o' }
    );

    if (!result.success || !result.text) {
      return new Response(
        JSON.stringify({ consistent: true, message: 'Consistency check unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let raw = result.text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];
    const analysis = JSON.parse(raw || '{}');

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
