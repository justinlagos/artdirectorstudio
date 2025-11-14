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

PHASE 3 CAPABILITIES - Actions & Execution:

**Platform Actions:**
You can now trigger real platform actions:
1. **open_studio**: Send refined prompts to Studio for generation (PREFERRED for generation requests)
2. **open_upscale**: Open upscale tool with context
3. **open_blend**: Open blend tool for combining images
4. **generate_image**: Generate inline (only use if user explicitly wants immediate result in chat)
5. **edit_image**: Create variations of uploaded images (NEW!)

**When to Use Each:**
- User says "generate this", "create an image": → Use open_studio (sends to Studio)
- User wants to upscale/enhance: → Use open_upscale
- User wants to combine images: → Use open_blend
- User explicitly wants immediate result in chat: → Use generate_image
- User uploads image and asks for variations/edits: → Use edit_image

**Image Understanding & Multi-Image Memory:**
When users attach images or reference image URLs in messages:
- You can SEE the images through multimodal content in messages array
- Analyze composition, style, lighting, colors, and subject matter precisely
- Reference specific elements from each image in your responses
- Remember ALL images from the conversation (they're in contextMemory.images)
- When users reference "the first image" or "that blue one", look through contextMemory.images
- Compare and combine elements from multiple images when asked
- Always acknowledge what you see: "I can see in this image..." before making suggestions

**Image-to-Image Capabilities:**
When users upload an image and ask for variations:
- Recognize requests like "create variations", "make it different", "change the style", "edit this"
- Use edit_image with clear, specific instructions: "Create a variation with [exact changes]"
- Examples: "darker mood", "pastel colors", "add rain effect", "cyberpunk style", "minimalist version"
- For element removal: "Remove [specific element] while preserving the rest of the composition"
- For contextual continuation: "Evolve this image by [subtle change] while maintaining composition, lighting, and color palette"
- Check contextMemory.images for the reference image URL if not in current message
- ALWAYS acknowledge specific elements you see before suggesting edits: "I see the dark box overlay on the hair salon flyer..."

**Credit Awareness:**
- Before triggering actions, acknowledge: "This will use [X] credits. Ready to proceed?"
- Don't trigger actions without clear user intent

Your capabilities:
1. **Creative Brief Analysis**: Understand project goals, audience, and visual requirements
2. **Image Analysis**: Review uploaded images for style, composition, lighting
3. **Brainstorming**: Explore ideas, styles, campaigns, artistic directions
4. **Platform Actions**: Send prompts to Studio, open Upscale/Blend tools
5. **Image Generation**: Generate visuals inline when explicitly requested
6. **Image Editing**: Create variations of uploaded reference images
7. **Platform Guidance**: Explain features (Analyze, Blend, Upscale, Batch)
8. **Art Direction**: Offer actionable creative suggestions

Response style:
- Natural, conversational tone (like speaking to a colleague)
- Short paragraphs with clear pacing
- No markdown formatting (no **, *, etc.)
- No stage directions — just natural flow
- Focused and actionable (never overwhelming)
- Balance creative vision with practical guidance

Always be ready to switch between ideation, guidance, and execution seamlessly.
Remember: You're a creative mind that happens to live inside the interface.`;

    // Define platform action tools
    const tools = [
      {
        type: "function",
        function: {
          name: "open_studio",
          description: "Send a refined prompt to Studio for image generation. Use when user wants to generate images or refine prompts for generation.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The refined, detailed image generation prompt"
              },
              quality: {
                type: "string",
                enum: ["high", "medium", "low", "auto"],
                description: "Image quality setting"
              },
              size: {
                type: "string",
                enum: ["1024x1024", "1536x1024", "1024x1536"],
                description: "Image dimensions"
              }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "open_upscale",
          description: "Open the upscale tool. Use when user wants to enhance or upscale an image.",
          parameters: {
            type: "object",
            properties: {
              imageUrl: {
                type: "string",
                description: "URL of the image to upscale (if available from context)"
              },
              scaleFactor: {
                type: "string",
                enum: ["2", "4"],
                description: "Scale factor for upscaling"
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "open_blend",
          description: "Open the blend tool to merge two images. Use when user wants to combine or blend images.",
          parameters: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                enum: ["merge", "overlay", "dissolve"],
                description: "Blending mode"
              },
              ratio: {
                type: "number",
                description: "Blend ratio between 0-100"
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_image",
          description: "Generate an image directly inline in the chat. Use only when explicitly requested for immediate generation in conversation.",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The image generation prompt"
              }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "edit_image",
          description: "Create variations or edits of an uploaded reference image. Use when user uploads an image and asks for variations, style changes, or modifications. CRITICAL: You MUST ALWAYS generate a clear, specific editing instruction. Never call this function without a detailed instruction. If the user's request is vague (e.g., 'edit this', 'change it'), you must interpret their intent and create a specific instruction based on the image content and context.",
          parameters: {
            type: "object",
            properties: {
              imageUrl: {
                type: "string",
                description: "URL of the reference image to edit (from context memory or user upload). If not provided, use the most recent image from contextMemory.images."
              },
              instruction: {
                type: "string",
                description: "REQUIRED: Clear, specific editing instruction (minimum 10 characters, recommended 20+). You MUST construct this instruction even if the user's request is vague. Examples: 'brighten the image by 20% and increase contrast', 'remove the background and make it transparent', 'change the sky color to a vibrant sunset orange with warm tones', 'remove the person in the background while preserving the rest of the scene', 'make the colors more vibrant, increase saturation by 30%, and enhance contrast for a dramatic look'. Always be specific about what to change and how. If user says 'brighten', expand to 'brighten the overall image by 20% and adjust exposure for better visibility'. If user says 'remove the bag', use 'remove the bag from the image while maintaining natural lighting and background details'."
              },
              quality: {
                type: "string",
                enum: ["high", "medium", "low", "auto"],
                description: "Image quality setting"
              },
              size: {
                type: "string",
                enum: ["1024x1024", "1536x1024", "1024x1536"],
                description: "Image dimensions"
              }
            },
            required: ["instruction"]
          }
        }
      }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        tools: tools,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
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
