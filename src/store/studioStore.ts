import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GenerationOptions } from "@/components/ImageGenerationDialog";
import { mapErrorMessage } from "@/lib/toolErrorMessages";

export type StudioGenerator = (
  prompt: string,
  options: GenerationOptions
) => Promise<string | null>;

const defaultStudioGenerator: StudioGenerator = async (prompt, options) => {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt is required for generation.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Please log in to continue.");
  }

  const { data, error } = await supabase.functions.invoke("generate-image", {
    body: {
      prompt: trimmedPrompt,
      quality: options.quality,
      size: options.size,
      background: options.background,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    // Parse structured error response
    let errorData: any = error;
    
    // Try to extract error details from FunctionsHttpError
    if (error.context) {
      try {
        errorData = typeof error.context === 'string' 
          ? JSON.parse(error.context) 
          : error.context;
      } catch {
        errorData = error;
      }
    }
    
    // Use the error mapping utility to get user-friendly message
    const friendlyMessage = mapErrorMessage(errorData);
    
    // Create enriched error with request ID for debugging
    const enrichedError = new Error(friendlyMessage);
    (enrichedError as any).requestId = errorData?.requestId;
    (enrichedError as any).errorType = errorData?.errorType;
    (enrichedError as any).details = errorData?.details;
    (enrichedError as any).retryable = errorData?.retryable;
    
    throw enrichedError;
  }

  if (!data?.image) {
    throw new Error("Failed to generate image. No image data returned.");
  }

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
