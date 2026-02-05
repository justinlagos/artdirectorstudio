/**
 * Unified Provider Client
 * Centralized API calls to OpenAI and Gemini (Google AI)
 * Replaces lovable.dev gateway with direct provider calls
 */

import { fetchWithRetry } from './retry.ts';
import { mapAIError, ERROR_MESSAGES } from './errors.ts';

export type ProviderType = 'openai' | 'gemini';

export interface ProviderRequest {
  provider: ProviderType;
  action: 'generate' | 'edit' | 'analyze' | 'chat' | 'caricature';
  prompt: string;
  image?: string;  // base64 data URI or HTTPS URL
  negativePrompt?: string;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    seed?: number;
    // Image generation specific
    size?: string;
    quality?: string;
    style?: string;
    // Image editing specific
    mask?: string;
    n?: number;
  };
}

export interface ProviderResponse {
  success: boolean;
  image?: string;
  imageUrl?: string;
  text?: string;
  error?: string;
  errorType?: string;
  metadata?: {
    model?: string;
    provider?: string;
    finishReason?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

/**
 * Call provider API with unified interface
 */
export async function callProvider(
  request: ProviderRequest,
  requestId?: string
): Promise<ProviderResponse> {
  const logPrefix = requestId ? `[${requestId}]` : '';

  try {
    console.log(`${logPrefix} Calling provider: ${request.provider}, action: ${request.action}`);

    if (request.provider === 'gemini') {
      return await callGemini(request, requestId);
    } else if (request.provider === 'openai') {
      return await callOpenAI(request, requestId);
    } else {
      throw new Error(`Unsupported provider: ${request.provider}`);
    }
  } catch (error) {
    console.error(`${logPrefix} Provider call failed:`, error);

    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_FAILED;

    return {
      success: false,
      error: errorMessage,
      errorType: 'provider_error',
      metadata: {
        provider: request.provider,
      }
    };
  }
}

/**
 * Call Google Gemini API
 * Uses google/gemini-3-pro-image-preview for image generation
 */
async function callGemini(
  request: ProviderRequest,
  requestId?: string
): Promise<ProviderResponse> {
  const logPrefix = requestId ? `[${requestId}]` : '';

  const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  // Determine model based on action
  let model = request.options?.model;
  if (!model) {
    if (request.action === 'generate' || request.action === 'caricature') {
      model = 'google/gemini-3-pro-image-preview';
    } else if (request.action === 'chat' || request.action === 'analyze') {
      model = 'google/gemini-pro';
    } else {
      model = 'google/gemini-3-pro-image-preview';
    }
  }

  // Build message content
  let messageContent: any;
  if (request.image) {
    messageContent = [
      {
        type: "text",
        text: request.prompt
      },
      {
        type: "image_url",
        image_url: {
          url: request.image
        }
      }
    ];
  } else {
    messageContent = request.prompt;
  }

  console.log(`${logPrefix} Gemini request: model=${model}`);

  // Call Gemini via Google AI API
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: Array.isArray(messageContent)
            ? messageContent.map(c => c.type === 'text' ? { text: c.text } : { inlineData: { data: c.image_url.url } })
            : [{ text: messageContent }]
        }],
        generationConfig: {
          temperature: request.options?.temperature ?? 0.9,
          maxOutputTokens: request.options?.maxTokens ?? 2048,
        }
      }),
    },
    { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 60000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${logPrefix} Gemini API error:`, { status: response.status, error: errorText });

    const friendlyMessage = mapAIError(response.status, errorText);
    return {
      success: false,
      error: friendlyMessage,
      errorType: response.status === 429 ? 'rate_limit' : 'ai_error',
      metadata: { provider: 'gemini', model }
    };
  }

  const data = await response.json();
  console.log(`${logPrefix} Gemini response received`);

  // Extract generated content
  const generatedImageUrl = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
                            data.candidates?.[0]?.content?.parts?.[0]?.image_url?.url;
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedImageUrl && !generatedText) {
    console.error(`${logPrefix} No content in Gemini response`);
    return {
      success: false,
      error: ERROR_MESSAGES.PROCESSING_FAILED,
      errorType: 'no_content',
      metadata: { provider: 'gemini', model }
    };
  }

  return {
    success: true,
    image: generatedImageUrl,
    text: generatedText,
    metadata: {
      provider: 'gemini',
      model,
      finishReason: data.candidates?.[0]?.finishReason,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined
    }
  };
}

/**
 * Call OpenAI API
 * Uses DALL-E 3 for image generation/editing
 */
async function callOpenAI(
  request: ProviderRequest,
  requestId?: string
): Promise<ProviderResponse> {
  const logPrefix = requestId ? `[${requestId}]` : '';

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Determine endpoint and model
  let endpoint: string;
  let model = request.options?.model;

  if (request.action === 'generate' || request.action === 'caricature') {
    endpoint = 'https://api.openai.com/v1/images/generations';
    model = model || 'dall-e-3';
  } else if (request.action === 'edit') {
    endpoint = 'https://api.openai.com/v1/images/edits';
    model = model || 'dall-e-2';  // DALL-E 3 doesn't support edits yet
  } else if (request.action === 'chat' || request.action === 'analyze') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    model = model || 'gpt-4-turbo';
  } else {
    endpoint = 'https://api.openai.com/v1/images/generations';
    model = model || 'dall-e-3';
  }

  console.log(`${logPrefix} OpenAI request: model=${model}, endpoint=${endpoint}`);

  let requestBody: any;

  if (request.action === 'chat' || request.action === 'analyze') {
    // Chat/analyze endpoint
    requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: request.prompt
        }
      ],
      temperature: request.options?.temperature ?? 0.7,
      max_tokens: request.options?.maxTokens ?? 1024,
    };
  } else {
    // Image generation/edit endpoint
    requestBody = {
      model,
      prompt: request.prompt,
      n: request.options?.n ?? 1,
      size: request.options?.size ?? '1024x1024',
      quality: request.options?.quality ?? 'standard',
      style: request.options?.style ?? 'vivid',
    };

    if (request.action === 'edit' && request.image) {
      requestBody.image = request.image;
      if (request.options?.mask) {
        requestBody.mask = request.options.mask;
      }
    }
  }

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 30000, timeoutMs: 90000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${logPrefix} OpenAI API error:`, { status: response.status, error: errorText });

    const friendlyMessage = mapAIError(response.status, errorText);
    return {
      success: false,
      error: friendlyMessage,
      errorType: response.status === 429 ? 'rate_limit' : 'ai_error',
      metadata: { provider: 'openai', model }
    };
  }

  const data = await response.json();
  console.log(`${logPrefix} OpenAI response received`);

  // Extract content based on endpoint
  let imageUrl: string | undefined;
  let text: string | undefined;

  if (request.action === 'chat' || request.action === 'analyze') {
    text = data.choices?.[0]?.message?.content;
  } else {
    imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  }

  if (!imageUrl && !text) {
    console.error(`${logPrefix} No content in OpenAI response`);
    return {
      success: false,
      error: ERROR_MESSAGES.PROCESSING_FAILED,
      errorType: 'no_content',
      metadata: { provider: 'openai', model }
    };
  }

  return {
    success: true,
    image: imageUrl,
    text,
    metadata: {
      provider: 'openai',
      model,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined
    }
  };
}
