/**
 * Artie Context Store
 * Maintains visual session context shared across Artie, Studio, Edit Image
 * Ensures continuity when jumping between tools
 */

import { useSyncExternalStore } from "react";

export interface ArtieContextImage {
  url: string;
  messageId?: string;
  name?: string;
  source: 'user' | 'artie' | 'studio' | 'edit' | 'generated';
  timestamp: string;
  analysis?: {
    style?: string[];
    mood?: string;
    composition?: string;
    lighting?: string;
    colorPalette?: string[];
  };
}

export interface ArtieContextOperation {
  tool: 'generate' | 'edit' | 'upscale' | 'blend' | 'artie';
  timestamp: number;
  prompt?: string;
  imageUrl?: string;
  params?: Record<string, unknown>;
}

export interface ArtieContextState {
  // Current active image and prompt
  activeImageId?: string;
  activeImageUrl?: string;
  basePrompt?: string;
  
  // Analysis and metadata
  analysisData?: Record<string, unknown>;
  styleTags?: string[];
  
  // Operation history (last 10)
  operationHistory: ArtieContextOperation[];
  
  // Image memory (last 20 images)
  imageMemory: ArtieContextImage[];
  
  // Timestamp
  lastModified: number;
  
  // Actions
  setActiveImage: (imageUrl: string, imageId?: string) => void;
  setPrompt: (prompt: string) => void;
  setAnalysis: (data: Record<string, unknown>) => void;
  addOperation: (operation: Omit<ArtieContextOperation, 'timestamp'>) => void;
  addImageToMemory: (image: Omit<ArtieContextImage, 'timestamp'>) => void;
  getLatestImage: () => ArtieContextImage | undefined;
  getFullContext: () => Omit<ArtieContextState, 'setActiveImage' | 'setPrompt' | 'setAnalysis' | 'addOperation' | 'addImageToMemory' | 'getLatestImage' | 'getFullContext' | 'reset'>;
  reset: () => void;
}

type PartialState =
  | Partial<ArtieContextState>
  | ((state: ArtieContextState) => Partial<ArtieContextState>);

const listeners = new Set<() => void>();
let state: ArtieContextState;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partial: PartialState) => {
  const partialState =
    typeof partial === "function" ? partial(state) : partial;

  state = {
    ...state,
    ...partialState,
    lastModified: Date.now(),
  };

  notify();
};

const initialState = {
  operationHistory: [],
  imageMemory: [],
  lastModified: Date.now(),
};

// Initialize state
state = {
  ...initialState,
  setActiveImage: (imageUrl: string, imageId?: string) => 
    setState({
      activeImageUrl: imageUrl,
      activeImageId: imageId,
    }),
  
  setPrompt: (prompt: string) => 
    setState({ basePrompt: prompt }),
  
  setAnalysis: (data: Record<string, unknown>) => 
    setState({ analysisData: data }),
  
  addOperation: (operation: Omit<ArtieContextOperation, 'timestamp'>) => 
    setState((prev) => ({
      operationHistory: [
        ...prev.operationHistory,
        { ...operation, timestamp: Date.now() }
      ].slice(-10), // Keep last 10
    })),
  
  addImageToMemory: (image: Omit<ArtieContextImage, 'timestamp'>) => 
    setState((prev) => {
      // Check if image already exists
      const exists = prev.imageMemory.some(img => img.url === image.url);
      if (exists) return {};
      
      return {
        imageMemory: [
          ...prev.imageMemory,
          { ...image, timestamp: new Date().toISOString() }
        ].slice(-20), // Keep last 20
      };
    }),
  
  getLatestImage: () => {
    return state.imageMemory[state.imageMemory.length - 1];
  },
  
  getFullContext: () => {
    const { setActiveImage, setPrompt, setAnalysis, addOperation, addImageToMemory, getLatestImage, getFullContext, reset, ...context } = state;
    return context;
  },
  
  reset: () => setState({ ...initialState }),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type UseArtieContext = {
  <T>(selector: (state: ArtieContextState) => T): T;
  getState: () => ArtieContextState;
  setState: (partial: PartialState) => void;
  subscribe: (listener: () => void) => () => void;
};

const useArtieContextBase = <T,>(selector: (state: ArtieContextState) => T): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const useArtieContext = useArtieContextBase as UseArtieContext;

useArtieContext.getState = () => state;
useArtieContext.setState = setState;
useArtieContext.subscribe = subscribe;
