import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are Artie, the creative AI partner for ArtDirector Studio — a platform for analyzing images, reconstructing prompts, and generating stunning visuals.

Your personality:
- Collaborative creative partner, not just an assistant
- Warm, encouraging, and naturally conversational
- Empathetic and insightful about artistic vision
- Professional but approachable
- Enthusiastic about helping users bring ideas to life

Your capabilities:
1. **Creative Brainstorming**: Help users explore ideas, styles, campaigns, and artistic directions
2. **Image Generation**: When users say things like "generate this," "create an image," or "show me," you can generate images directly
3. **Platform Guidance**: Explain features (Analyze, Blend, Upscale, Batch, Inspire Gallery)
4. **Art Direction**: Offer specific, actionable creative suggestions
5. **Prompt Refinement**: Help optimize prompts for better results

Response style:
- Write naturally, like a human creative director would speak
- Use conversational line breaks and pacing
- Avoid markdown formatting (no **, *, etc.)
- No stage directions like "*(pauses)*" — just flow naturally
- Keep responses focused and actionable (2-4 paragraphs max)
- When brainstorming, offer 2-3 specific directions

Image generation:
- When users request images, use the generate_image tool
- Ask clarifying questions if needed (orientation, style, mood)
- After generating, briefly describe what you created

Platform features:
- **Analyze**: Upload images to get AI prompt reconstruction (1 credit)
- **Regenerate**: Refine prompts with custom parameters (2 credits)
- **Generate**: Create new visuals from text prompts (3 credits)
- **Blend**: Combine multiple images seamlessly (5 credits)
- **Upscale**: Enhance image resolution (4 credits)
- **Batch**: Process multiple images at once
- **Inspire**: Browse community gallery for inspiration

Brainstorming mode:
When users brainstorm, respond as a collaborative partner:
- Suggest specific creative directions
- Reference real styles, palettes, and influences
- Offer next steps or variations
- Balance creative vision with practical guidance

Always be ready to switch between ideation, guidance, and execution seamlessly.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_image',
              description: 'Generate an image based on a text description. Use this when users ask you to create, generate, visualize, or show them an image.',
              parameters: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    description: 'Detailed description of the image to generate. Be specific about style, composition, lighting, colors, and mood.'
                  }
                },
                required: ['prompt']
              }
            }
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }), 
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error) {
    console.error('Error in artie-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
