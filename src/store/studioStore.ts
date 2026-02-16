import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GenerationOptions } from "@/components/ImageGenerationDialog";
import { mapErrorMessage } from "@/lib/toolErrorMessages";
import { analytics } from "@/lib/analytics";
import { convertToBackendFormat } from "@/lib/generationParams";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

export type StudioGenerator = (
  prompt: string,
  options: GenerationOptions
) => Promise<string | null>;

const defaultStudioGenerator: StudioGenerator = async (prompt, options) => {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt is required for generation.");
  }

  const startTime = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Please log in to continue.");
  }

  // Convert to new backend format
  const backendParams = convertToBackendFormat(options);

  const { data, error } = await supabase.functions.invoke("generate-image", {
    body: {
      prompt: trimmedPrompt,
      ...backendParams,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    // Track generation failure
    analytics.track("Image Generation", {
      tool: "generate",
      action: "generate",
      success: false,
      has_reference: !!options.referenceImageUrl,
      error_type: error.message?.substring(0, 50) || "unknown",
    });

    const parsedError = await parseEdgeFunctionError(error);

    // Prefer parsed server message when available, then map to fallback copy.
    const friendlyMessage =
      parsedError.message && parsedError.message !== "Edge Function returned a non-2xx status code"
        ? parsedError.message
        : mapErrorMessage({ message: parsedError.rawMessage, status: parsedError.status });
    
    // Create enriched error with request ID for debugging
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).requestId = parsedError.details?.requestId || undefined;
    (enrichedError as any).errorType = parsedError.errorType;
    (enrichedError as any).details = parsedError.details;
    (enrichedError as any).retryable = parsedError.status === 429 || (parsedError.status != null && parsedError.status >= 500);
    
    throw enrichedError;
  }

  if (!data?.image) {
    analytics.track("Image Generation", {
      tool: "generate",
      action: "generate",
      success: false,
      has_reference: !!options.referenceImageUrl,
      error_type: "no_image_data",
    });
    throw new Error("Failed to generate image. No image data returned.");
  }

  // Verify the image was saved to database
  if (!data.assetId) {
    console.warn("[Studio] Image generated but not saved to My Projects. Attempting fallback save...");
    
    // Fallback: Use the improved saveAsset utility instead of raw Supabase calls
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use the unified saveAsset utility for consistency and better error handling
        const { saveAsset } = await import('@/lib/saveAsset');
        
        const assetId = await saveAsset({
          imageUrl: data.image,
          action: 'generate',
          prompt: trimmedPrompt,
          params: {
            quality: options.quality,
            size: options.size,
            background: options.background,
            fallback_save: true
          },
          skipToast: false, // Show toast even for fallback saves
        });

        if (assetId) {
          console.log("[Studio] Fallback save successful:", assetId);
        } else {
          console.error("[Studio] Fallback save returned null - save may have failed");
          // Still return the image - user can see it even if not saved
        }
      } else {
        console.warn("[Studio] Fallback save skipped - no user found");
      }
    } catch (fallbackError) {
      console.error("[Studio] Fallback save exception:", {
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        stack: fallbackError instanceof Error ? fallbackError.stack : undefined
      });
      // Continue - image is still available even if save failed
    }
  } else {
    console.log("[Studio] Image saved to My Projects:", data.assetId);
  }

  // Track successful generation
  const duration = Date.now() - startTime;
  analytics.track("Image Generation", {
    tool: "generate",
    action: "generate",
    success: true,
    has_reference: !!options.referenceImageUrl,
    duration_ms: duration,
    asset_id: data.assetId || undefined,
  });

  return data.image as string;
};

export interface StudioStoreState {
  prompt: string;
  imageUrl?: string;
  meta: Record<string, unknown> | null;
  generator: StudioGenerator | null;
  setPrompt: (prompt: string) => void;
  setImage: (imageUrl?: string) => void;
  setMeta: (meta?: Record<string, unknown>) => void;
  setGenerator: (generator: StudioGenerator | null) => void;
  reset: () => void;
}

type StudioStoreSelector<T> = (state: StudioStoreState) => T;

type PartialState =
  | Partial<StudioStoreState>
  | ((state: StudioStoreState) => Partial<StudioStoreState>);

const listeners = new Set<() => void>();
let state: StudioStoreState;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partial: PartialState) => {
  const partialState =
    typeof partial === "function" ? partial(state) : partial;

  state = {
    ...state,
    ...partialState,
  };

  notify();
};

state = {
  prompt: "",
  imageUrl: undefined,
  meta: null,
  generator: defaultStudioGenerator,
  setPrompt: (prompt: string) => setState({ prompt }),
  setImage: (imageUrl?: string) => setState({ imageUrl }),
  setMeta: (meta?: Record<string, unknown>) => setState({ meta: meta ?? null }),
  setGenerator: (generator: StudioGenerator | null) =>
    setState({ generator: generator ?? defaultStudioGenerator }),
  reset: () => setState({ prompt: "", imageUrl: undefined, meta: null }),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type UseStudioStore = {
  <T>(selector: StudioStoreSelector<T>): T;
  getState: () => StudioStoreState;
  setState: (partial: PartialState) => void;
  subscribe: (listener: () => void) => () => void;
};

const useStudioStoreBase = <T,>(selector: StudioStoreSelector<T>): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const useStudioStore = useStudioStoreBase as UseStudioStore;

useStudioStore.getState = () => state;
useStudioStore.setState = setState;
useStudioStore.subscribe = subscribe;

export { defaultStudioGenerator };
