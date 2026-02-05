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
    const { brandKitId, logoUrl, guidelinesText } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process brand kit with AI
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
            content: 'You are a brand guideline analyzer. Extract structured information from brand guidelines and return JSON.',
          },
          {
            role: 'user',
            content: `Analyze these brand guidelines and extract:
1. Typography rules (primary font, secondary font, heading font, body font)
2. Usage rules (logo placement, color usage, imagery style, tone)

${guidelinesText ? `Guidelines text:\n${guidelinesText}` : 'No guidelines text provided.'}
${logoUrl ? `Logo URL: ${logoUrl}` : ''}

Return JSON in this format:
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
}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI processing failed');
    }

    const data = await response.json();
    const aiAnalysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');

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
