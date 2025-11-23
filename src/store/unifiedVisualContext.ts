/**
 * Unified Visual Context Store
 * Consolidates visualContextStore and useArtieContext into a single source of truth
 * Maintains visual session context shared across Artie, Studio, Edit Image
 */

import { useSyncExternalStore } from "react";

export interface OperationHistoryEntry {
  tool: 'generate' | 'edit' | 'upscale' | 'blend' | 'artie';
  timestamp: number;
  prompt?: string;
  imageUrl?: string;
  params?: Record<string, unknown>;
}

export interface ImageMemoryEntry {
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

export interface UnifiedVisualContext {
  // Current active image and prompt
  activeImageId?: string;
  activeImageUrl?: string;
  basePrompt?: string;
  
  // Analysis and metadata
  analysisData?: Record<string, unknown>;
  styleTags?: string[];
  
  // Operation history (last 10)
  operationHistory: OperationHistoryEntry[];
  
  // Image memory (last 20 images)
  imageMemory: ImageMemoryEntry[];
  
  // Timestamp
  lastModified: number;
}

type PartialContext =
  | Partial<UnifiedVisualContext>
  | ((state: UnifiedVisualContext) => Partial<UnifiedVisualContext>);

interface UnifiedVisualContextStore extends UnifiedVisualContext {
  setContext: (partial: PartialContext) => void;
  setActiveImage: (imageUrl: string, imageId?: string) => void;
  setPrompt: (prompt: string) => void;
  setAnalysis: (data: Record<string, unknown>) => void;
  addOperation: (operation: Omit<OperationHistoryEntry, 'timestamp'>) => void;
  addImageToMemory: (image: Omit<ImageMemoryEntry, 'timestamp'>) => void;
  getLatestImage: () => ImageMemoryEntry | undefined;
  getFullContext: () => UnifiedVisualContext;
  reset: () => void;
}

const listeners = new Set<() => void>();
let state: UnifiedVisualContext;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const initialState: UnifiedVisualContext = {
  operationHistory: [],
  imageMemory: [],
  lastModified: Date.now(),
};

const setState = (partial: PartialContext) => {
  const partialState =
    typeof partial === "function" ? partial(state) : partial;

  state = {
    ...state,
    ...partialState,
    lastModified: Date.now(),
  };

  notify();
};

state = { ...initialState };

const setContext = (partial: PartialContext) => setState(partial);

const setActiveImage = (imageUrl: string, imageId?: string) => {
  setState({
    activeImageUrl: imageUrl,
    activeImageId: imageId,
  });
};

const setPrompt = (prompt: string) => {
  setState({ basePrompt: prompt });
};

const setAnalysis = (data: Record<string, unknown>) => {
  setState({ analysisData: data });
};

const addOperation = (operation: Omit<OperationHistoryEntry, 'timestamp'>) => {
  setState((prev) => ({
    operationHistory: [
      ...prev.operationHistory,
      { ...operation, timestamp: Date.now() }
    ].slice(-10), // Keep last 10 operations
  }));
};

const addImageToMemory = (image: Omit<ImageMemoryEntry, 'timestamp'>) => {
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
  });
};

const getLatestImage = () => {
  return state.imageMemory[state.imageMemory.length - 1];
};

const getFullContext = () => ({ ...state });

const reset = () => setState({ ...initialState });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type UnifiedVisualContextSelector<T> = (state: UnifiedVisualContextStore) => T;

type UseUnifiedVisualContext = {
  <T>(selector: UnifiedVisualContextSelector<T>): T;
  getState: () => UnifiedVisualContextStore;
  setState: (partial: PartialContext) => void;
  subscribe: (listener: () => void) => () => void;
};

const useUnifiedVisualContextBase = <T,>(selector: UnifiedVisualContextSelector<T>): T =>
  useSyncExternalStore(
    subscribe,
    () => selector({
      ...state,
      setContext,
      setActiveImage,
      setPrompt,
      setAnalysis,
      addOperation,
      addImageToMemory,
      getLatestImage,
      getFullContext,
      reset,
    }),
    () => selector({
      ...state,
      setContext,
      setActiveImage,
      setPrompt,
      setAnalysis,
      addOperation,
      addImageToMemory,
      getLatestImage,
      getFullContext,
      reset,
    })
  );

export const useUnifiedVisualContext = useUnifiedVisualContextBase as UseUnifiedVisualContext;

useUnifiedVisualContext.getState = () => ({
  ...state,
  setContext,
  setActiveImage,
  setPrompt,
  setAnalysis,
  addOperation,
  addImageToMemory,
  getLatestImage,
  getFullContext,
  reset,
});
useUnifiedVisualContext.setState = setState;
useUnifiedVisualContext.subscribe = subscribe;
