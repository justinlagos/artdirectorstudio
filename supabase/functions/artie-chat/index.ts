import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import system prompt from shared file (ensure this matches src/lib/artieSystemPrompt.ts)
import { artieSystemPrompt } from "./systemPrompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request has body
    if (!req.body) {
      return new Response(
        JSON.stringify({ error: 'Request body is required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, attachments, contextMemory, environmentContext } = requestData;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: LOVABLE_API_KEY is not configured' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use the master system prompt from shared file
    const systemPrompt = artieSystemPrompt;

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
        messages: (() => {
          // Build messages with system prompt and optional environment context
          const systemMessages: Array<{ role: string; content: string }> = [
            { role: 'system', content: systemPrompt }
          ];

          // Add environment context as a system message if provided
          if (environmentContext) {
            systemMessages.push({
              role: 'system',
              content: `Environment context: ${JSON.stringify(environmentContext)}`
            });
          }

          return [
            ...systemMessages,
            ...messages
          ];
        })(),
        stream: true,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'AI service unavailable';
      try {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        // Try to parse as JSON for more detailed error
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text (truncated if too long)
          errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText || errorMessage;
        }
      } catch (textError) {
        console.error('Error reading error response:', textError);
      }
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: response.status,
          details: 'The AI service returned an error. Please try again.'
        }), 
        { 
          status: response.status >= 400 && response.status < 600 ? response.status : 500,
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
