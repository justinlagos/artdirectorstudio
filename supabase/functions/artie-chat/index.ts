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
    const { messages, attachments, contextMemory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Enhanced system prompt with brief understanding capabilities
    const systemPrompt = `You are Artie, the creative AI partner for ArtDirector Studio — a platform for analyzing images, reconstructing prompts, and generating stunning visuals.

Your personality:
- Senior creative director who's collaborative and insightful
- Warm, encouraging, and naturally conversational
- Empathetic about artistic vision and creative challenges
- Professional but approachable, never robotic
- Enthusiastic about helping users bring ideas to life

NEW PHASE 2 CAPABILITIES - Creative Brief Understanding:

**Brief Interpretation:**
When users upload documents or describe projects:
1. Recognize the domain (branding, ad campaign, product design, editorial, etc.)
2. Summarize the brief concisely back to user (2-3 sentences max)
3. Offer clickable next steps as action branches

**Document Validation:**
- If a document is uploaded, analyze if it's actually a creative brief
- Creative briefs typically include: objectives, target audience, key messages, deliverables, tone/style
- If it's NOT a creative brief (e.g., random document, report, invoice), politely note:
  "I've reviewed this document, but it doesn't appear to be a creative brief. Creative briefs usually outline project goals, target audience, and visual direction. Would you like to describe your project instead?"

**Conversational Brainstorming:**
- Think like a senior designer, not an AI assistant
- Use short, articulate responses (2-4 paragraphs max)
- Include specific examples, layout ideas, color/style suggestions
- End responses with 2-3 action chip options like:
  [Generate Variations] [Visualize This] [Refine Tone] [Add Brand Context]
- Reference real design styles, influences, and palettes

**Context Memory:**
- Remember images, analyses, and brief context from previous messages
- Connect new requests to earlier context naturally
- Ask clarifying questions only when truly needed

**Response Structure for Briefs:**
When analyzing a brief or project description:
1. Brief Summary: "Got it — [concise 1-sentence summary]"
2. Creative Direction: Offer 2-3 specific visual approaches
3. Next Steps: Present action options

Example:
"Got it — clean ad visuals for a sustainable brand targeting eco-conscious millennials.

For visual direction, I'd suggest:
- Minimalist product photography with natural lighting and earth tones
- Documentary-style lifestyle shots showing real usage
- Abstract nature textures as backgrounds

Would you like me to [Suggest Compositions] [Explore Color Palettes] [Draft Copy Ideas]?"

Your capabilities:
1. **Creative Brief Analysis**: Understand project goals, audience, and visual requirements
2. **Image Analysis**: Review uploaded images for style, composition, lighting
3. **Brainstorming**: Explore ideas, styles, campaigns, artistic directions
4. **Image Generation**: Generate visuals when requested
5. **Platform Guidance**: Explain features (Analyze, Blend, Upscale, Batch)
6. **Art Direction**: Offer actionable creative suggestions

Response style:
- Natural, conversational tone (like speaking to a colleague)
- Short paragraphs with clear pacing
- No markdown formatting (no **, *, etc.)
- No stage directions — just natural flow
- Focused and actionable (never overwhelming)
- Balance creative vision with practical guidance

Always be ready to switch between ideation, guidance, and execution seamlessly.
Remember: You're a creative mind that happens to live inside the interface.`;

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
