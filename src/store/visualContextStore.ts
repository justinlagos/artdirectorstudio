/**
 * Visual Context Store
 * Maintains continuity of image context across Artie → Studio → Edit flows
 * Prevents context drift and ensures all tools work with the same base image/prompt
 */

import { useSyncExternalStore } from "react";

export interface VisualContext {
  activeImageId?: string;
  activeImageUrl?: string;
  basePrompt?: string;
  analysisData?: Record<string, unknown>;
  styleTags?: string[];
  operationHistory: OperationHistoryEntry[];
  lastModified: number;
}

export interface OperationHistoryEntry {
  tool: 'generate' | 'edit' | 'upscale' | 'blend' | 'artie';
  timestamp: number;
  prompt?: string;
  imageUrl?: string;
  params?: Record<string, unknown>;
}

type PartialContext =
  | Partial<VisualContext>
  | ((state: VisualContext) => Partial<VisualContext>);

interface VisualContextStore extends VisualContext {
  setContext: (partial: PartialContext) => void;
  updatePrompt: (prompt: string) => void;
  updateImage: (imageUrl: string, imageId?: string) => void;
  addOperation: (operation: Omit<OperationHistoryEntry, 'timestamp'>) => void;
  reset: () => void;
  getFullContext: () => VisualContext;
}

const listeners = new Set<() => void>();
let state: VisualContext;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const initialState: VisualContext = {
  operationHistory: [],
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

const updatePrompt = (prompt: string) => {
  setState({ basePrompt: prompt });
};

const updateImage = (imageUrl: string, imageId?: string) => {
  setState({
    activeImageUrl: imageUrl,
    activeImageId: imageId,
  });
};

const addOperation = (operation: Omit<OperationHistoryEntry, 'timestamp'>) => {
  setState((prev) => ({
    operationHistory: [
      ...prev.operationHistory,
      { ...operation, timestamp: Date.now() },
    ].slice(-10), // Keep last 10 operations
  }));
};

const reset = () => setState({ ...initialState });

const getFullContext = () => ({ ...state });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type VisualContextSelector<T> = (state: VisualContextStore) => T;

type UseVisualContextStore = {
  <T>(selector: VisualContextSelector<T>): T;
  getState: () => VisualContextStore;
  setState: (partial: PartialContext) => void;
  subscribe: (listener: () => void) => () => void;
};

const useVisualContextStoreBase = <T,>(selector: VisualContextSelector<T>): T =>
  useSyncExternalStore(
    subscribe,
    () => selector({
      ...state,
      setContext,
      updatePrompt,
      updateImage,
      addOperation,
      reset,
      getFullContext,
    }),
    () => selector({
      ...state,
      setContext,
      updatePrompt,
      updateImage,
      addOperation,
      reset,
      getFullContext,
    })
  );

export const useVisualContextStore = useVisualContextStoreBase as UseVisualContextStore;

useVisualContextStore.getState = () => ({
  ...state,
  setContext,
  updatePrompt,
  updateImage,
  addOperation,
  reset,
  getFullContext,
});
useVisualContextStore.setState = setState;
useVisualContextStore.subscribe = subscribe;
