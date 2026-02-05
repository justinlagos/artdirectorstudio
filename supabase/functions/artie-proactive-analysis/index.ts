import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get user from JWT
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

    // Check if proactive mode is enabled
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('ui_preferences')
      .eq('id', userId)
      .single();

    const preferences = profile?.ui_preferences as any;
    const enabled = preferences?.experimentalFeatures?.proactiveArtie === true ||
                   preferences?.artieProactiveMode === 'enabled';

    if (!enabled) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { triggerType, context } = await req.json();

    // Get LOVABLE_API_KEY for AI analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate suggestion based on trigger type
    let suggestion = null;

    switch (triggerType) {
      case 'brief_uploaded':
        if (context.briefContent) {
          // Analyze brief with AI
          const briefAnalysis = await analyzeBriefWithAI(context.briefContent, LOVABLE_API_KEY);
          if (briefAnalysis) {
            suggestion = {
              triggerType: 'brief_uploaded',
              suggestion: briefAnalysis.suggestion,
              context: briefAnalysis.context,
              priority: briefAnalysis.priority || 'medium',
            };
          }
        }
        break;

      case 'generation_complete':
        // Suggest next steps
        suggestion = {
          triggerType: 'generation_complete',
          suggestion: 'Great image! Would you like me to upscale it for higher resolution or create variations?',
          context: { imageUrl: context.currentImageUrl },
          priority: 'medium',
        };
        break;

      case 'iteration_count':
        if (context.iterationCount >= 5) {
          suggestion = {
            triggerType: 'iteration_count',
            suggestion: `You've iterated ${context.iterationCount} times. Would you like me to analyze what's working and suggest a more direct approach?`,
            context: { iterationCount: context.iterationCount },
            priority: 'high',
          };
        }
        break;

      case 'multiple_images':
        if (context.imageList && context.imageList.length >= 2) {
          suggestion = {
            triggerType: 'multiple_images',
            suggestion: `You have ${context.imageList.length} images. Would you like to blend them together or create a campaign with multiple formats?`,
            context: { imageCount: context.imageList.length },
            priority: 'medium',
          };
        }
        break;
    }

    // Save suggestion to database if generated
    if (suggestion) {
      const { error: insertError } = await supabaseAdmin
        .from('artie_strategic_insights')
        .insert({
          user_id: userId,
          trigger_type: suggestion.triggerType,
          suggestion: suggestion.suggestion,
          context: suggestion.context,
          priority: suggestion.priority,
        });

      if (insertError) {
        console.error('[artie-proactive-analysis] Error saving suggestion:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestion: suggestion ? {
          id: 'temp-id', // Will be replaced by actual ID from database
          ...suggestion,
        } : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[artie-proactive-analysis] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Analyze brief with AI to generate suggestions
 */
async function analyzeBriefWithAI(
  briefContent: string,
  apiKey: string
): Promise<{ suggestion: string; context: any; priority: string } | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a creative assistant analyzing creative briefs. Identify missing information and suggest what would help create better results. Be concise and helpful.',
          },
          {
            role: 'user',
            content: `Analyze this creative brief and suggest what information might be missing:\n\n${briefContent}`,
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return null;
    }

    // Extract missing elements from analysis
    const missingElements: string[] = [];
    if (!briefContent.toLowerCase().includes('color')) missingElements.push('color palette');
    if (!briefContent.toLowerCase().includes('style')) missingElements.push('visual style');
    if (!briefContent.toLowerCase().includes('mood')) missingElements.push('mood');

    if (missingElements.length === 0) {
      return null; // Brief is complete
    }

    return {
      suggestion: `Your brief looks good! Consider adding details about: ${missingElements.join(', ')}. This will help generate more accurate results.`,
      context: { briefLength: briefContent.length, missingElements, aiAnalysis: analysis },
      priority: 'medium',
    };
  } catch (error) {
    console.error('[artie-proactive-analysis] Error analyzing brief:', error);
    return null;
  }
}
