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
  currentContext?: VisualContextPayload;
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

export interface VisualContextPayload {
  imageUrl?: string;
  prompt?: string;
  toolOrigin?: 'artie' | 'studio' | 'edit' | 'blend' | 'upscale';
  aspectRatio?: string;
  styleTags?: string[];
  meta?: Record<string, unknown>;
}

type PartialContext =
  | Partial<VisualContext>
  | ((state: VisualContext) => Partial<VisualContext>);

interface VisualContextStore extends VisualContext {
  setContext: (partial: PartialContext) => void;
  updatePrompt: (prompt: string) => void;
  updateImage: (imageUrl: string, imageId?: string) => void;
  setContextPayload: (context: VisualContextPayload) => void;
  addOperation: (operation: Omit<OperationHistoryEntry, 'timestamp'>) => void;
  reset: () => void;
  getFullContext: () => VisualContext;
}

const initialState: VisualContext = {
  currentContext: {},
  operationHistory: [],
  lastModified: Date.now(),
};

const listeners = new Set<() => void>();
let state: VisualContext = { ...initialState };
let snapshot: VisualContextStore;

const notify = () => {
  listeners.forEach((listener) => listener());
};

function setContext(partial: PartialContext) {
  setState(partial);
}

function updatePrompt(prompt: string) {
  setState({ basePrompt: prompt });
}

function updateImage(imageUrl: string, imageId?: string) {
  setState({
    activeImageUrl: imageUrl,
    activeImageId: imageId,
    currentContext: {
      ...state.currentContext,
      imageUrl,
    }
  });
}

function setContextPayload(context: VisualContextPayload) {
  setState({
    currentContext: {
      ...state.currentContext,
      ...context,
    },
    basePrompt: context.prompt ?? state.basePrompt,
    activeImageUrl: context.imageUrl ?? state.activeImageUrl,
  });
}

function addOperation(operation: Omit<OperationHistoryEntry, 'timestamp'>) {
  setState((prev) => ({
    operationHistory: [
      ...prev.operationHistory,
      { ...operation, timestamp: Date.now() },
    ].slice(-10), // Keep last 10 operations
  }));
}

function reset() {
  setState({ ...initialState });
}

function getFullContext() {
  return { ...state };
}

const buildSnapshot = (): VisualContextStore => ({
  ...state,
  setContext,
  updatePrompt,
  updateImage,
  setContextPayload,
  addOperation,
  reset,
  getFullContext,
});

function setState(partial: PartialContext) {
  const partialState =
    typeof partial === "function" ? partial({ ...state }) : partial;

  state = {
    ...state,
    ...partialState,
    lastModified: Date.now(),
  };

  snapshot = buildSnapshot();
  notify();
}

snapshot = buildSnapshot();

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
    () => selector(snapshot),
    () => selector(snapshot)
  );

export const useVisualContextStore = useVisualContextStoreBase as UseVisualContextStore;

useVisualContextStore.getState = () => snapshot;
useVisualContextStore.setState = setState;
useVisualContextStore.subscribe = subscribe;
