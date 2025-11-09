import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[get-similar-works] Fetching recommendations for user: ${user.id}`);

    // Fetch user's recent generated works
    const { data: userWorks, error: worksError } = await supabase
      .from('generated_assets')
      .select('prompt, analysis_data')
      .eq('user_id', user.id)
      .not('prompt', 'is', null)
      .order('created_at', { ascending: false })
      .limit(15);

    if (worksError) {
      console.error('[get-similar-works] Error fetching user works:', worksError);
      throw worksError;
    }

    if (!userWorks || userWorks.length === 0) {
      console.log('[get-similar-works] No user works found, returning empty recommendations');
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract prompts for AI analysis
    const prompts = userWorks.map(w => w.prompt).filter(Boolean).slice(0, 10);
    console.log(`[get-similar-works] Analyzing ${prompts.length} prompts`);

    // Use Lovable AI to analyze user preferences
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[get-similar-works] LOVABLE_API_KEY not configured');
      throw new Error("AI service not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Analyze these image generation prompts and extract key themes, styles, subjects, and aesthetic preferences. Return ONLY a JSON object (no markdown, no code blocks) with these arrays: {"styles": [], "subjects": [], "moods": [], "keywords": []}. Keep each array to max 8 items. Prompts: ${prompts.join('; ')}`
        }]
      }),
    });

    if (!aiResponse.ok) {
      console.error('[get-similar-works] AI API error:', aiResponse.status);
      const errorText = await aiResponse.text();
      console.error('[get-similar-works] AI API error details:', errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[get-similar-works] No content in AI response');
      throw new Error("Invalid AI response");
    }

    // Parse AI response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```json?\s*/, '').replace(/```\s*$/, '');
    }
    
    const analysis = JSON.parse(cleanedContent);
    console.log('[get-similar-works] AI analysis:', analysis);

    // Query shared_assets for similar content
    const { data: allSharedAssets, error: assetsError } = await supabase
      .from('shared_assets')
      .select(`
        id, share_token, view_count, like_count, bookmark_count,
        featured, staff_pick, tags, created_at, user_id,
        asset:generated_assets!shared_assets_asset_id_fkey(
          id, type, image_url, prompt, created_at
        ),
        profile:profiles!shared_assets_user_id_fkey(
          id, email, username
        )
      `)
      .eq('is_inspire_approved', true)
      .eq('is_deleted', false)
      .neq('user_id', user.id)
      .not('asset', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (assetsError) {
      console.error('[get-similar-works] Error fetching assets:', assetsError);
      throw assetsError;
    }

    if (!allSharedAssets || allSharedAssets.length === 0) {
      console.log('[get-similar-works] No shared assets found');
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[get-similar-works] Scoring ${allSharedAssets.length} assets`);

    // Score and rank recommendations based on similarity
    const scored = allSharedAssets.map(item => {
      let score = 0;
      const itemTags = item.tags as any || {};
      
      // Match styles (weight: 3)
      if (itemTags.style && Array.isArray(itemTags.style)) {
        const styleMatches = analysis.styles?.filter((s: string) => 
          itemTags.style.some((t: string) => t.toLowerCase().includes(s.toLowerCase()))
        ).length || 0;
        score += styleMatches * 3;
      }
      
      // Match moods (weight: 2)
      if (itemTags.mood && Array.isArray(itemTags.mood)) {
        const moodMatches = analysis.moods?.filter((m: string) => 
          itemTags.mood.some((t: string) => t.toLowerCase().includes(m.toLowerCase()))
        ).length || 0;
        score += moodMatches * 2;
      }
      
      // Match keywords in prompt (weight: 1)
      const assetData = Array.isArray(item.asset) ? item.asset[0] : item.asset;
      const prompt = assetData?.prompt?.toLowerCase() || '';
      const keywordMatches = analysis.keywords?.filter((k: string) => 
        prompt.includes(k.toLowerCase())
      ).length || 0;
      score += keywordMatches;

      // Boost recent popular items
      const daysOld = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld <= 7) {
        score += (item.like_count * 0.5) + (item.view_count * 0.1);
      }

      return { ...item, similarity_score: score };
    })
    .filter(item => item.similarity_score > 0)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 24);

    console.log(`[get-similar-works] Returning ${scored.length} recommendations`);

    return new Response(JSON.stringify({ 
      recommendations: scored,
      analysis_summary: {
        styles: analysis.styles?.slice(0, 5),
        moods: analysis.moods?.slice(0, 5)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[get-similar-works] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
