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
    const { brandKitId, logoUrl, guidelinesText } = await req.json();

    const { chatWithProvider, getDefaultProvider } = await import('../_shared/providerClient.ts');
    const provider = getDefaultProvider();
    const hasKey = provider === 'gemini' ? !!Deno.env.get('GOOGLE_AI_API_KEY') : !!Deno.env.get('OPENAI_API_KEY');
    if (!hasKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY in Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userContent = `Analyze these brand guidelines and extract:
1. Typography rules (primary font, secondary font, heading font, body font)
2. Usage rules (logo placement, color usage, imagery style, tone)

${guidelinesText ? `Guidelines text:\n${guidelinesText}` : 'No guidelines text provided.'}
${logoUrl ? `Logo URL: ${logoUrl}` : ''}

Return ONLY a valid JSON object (no markdown) in this format:
{
  "typography": {
    "primaryFont": "...",
    "secondaryFont": "...",
    "headingFont": "...",
    "bodyFont": "..."
  },
  "usageRules": {
    "logoPlacement": ["..."],
    "colorUsage": ["..."],
    "imageryStyle": "...",
    "tone": "..."
  }
}`;

    const result = await chatWithProvider(
      [
        { role: 'system', content: 'You are a brand guideline analyzer. Extract structured information from brand guidelines and return JSON only.' },
        { role: 'user', content: userContent },
      ],
      { model: provider === 'gemini' ? 'gemini-2.5-pro' : 'gpt-4o' }
    );

    if (!result.success || !result.text) {
      throw new Error(result.error || 'AI processing failed');
    }

    let raw = result.text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];
    const aiAnalysis = JSON.parse(raw || '{}');

    // Update brand kit with AI analysis
    if (brandKitId) {
      const { error: updateError } = await supabaseAdmin
        .from('brand_kits')
        .update({
          typography: aiAnalysis.typography || {},
          usage_rules: aiAnalysis.usageRules || {},
        })
        .eq('id', brandKitId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[process-brand-kit] Error updating brand kit:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        typography: aiAnalysis.typography || {},
        usageRules: aiAnalysis.usageRules || {},
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-brand-kit] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
