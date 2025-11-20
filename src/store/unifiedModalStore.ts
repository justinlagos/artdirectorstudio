/**
 * Unified Modal Store
 * Single source of truth for all modal state management
 * Provides consistent API for opening/closing modals across the platform
 */

import { useSyncExternalStore } from "react";

export type ModalType = 
  | 'generate' 
  | 'edit' 
  | 'upscale' 
  | 'blend' 
  | 'artie' 
  | 'settings'
  | 'custom-preset'
  | 'credit-purchase'
  | 'subscription';

export interface ModalPayload {
  generate?: { 
    prompt?: string; 
    imageUrl?: string;
    referenceImage?: string;
  };
  edit?: { 
    imageUrl: string; 
    instruction?: string;
  };
  upscale?: { 
    imageUrl: string;
  };
  blend?: { 
    images: string[];
  };
  artie?: { 
    initialMessage?: string;
    contextImages?: string[];
  };
  settings?: { 
    tab?: string;
  };
  'custom-preset'?: {
    mode?: 'create' | 'edit';
    presetId?: string;
  };
  'credit-purchase'?: {
    package?: string;
  };
  subscription?: {
    tier?: string;
  };
}

type PartialState =
  | Partial<UnifiedModalStore>
  | ((state: UnifiedModalStore) => Partial<UnifiedModalStore>);

export interface UnifiedModalStore {
  activeModal: ModalType | null;
  modalPayload: ModalPayload;
  openModal: (type: ModalType, payload?: any) => void;
  closeModal: () => void;
  closeAllModals: () => void;
  isModalOpen: (type: ModalType) => boolean;
  getModalPayload: <T extends ModalType>(type: T) => ModalPayload[T] | undefined;
}

const listeners = new Set<() => void>();
let state: UnifiedModalStore;

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

const openModal = (type: ModalType, payload?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[UnifiedModal] Opening ${type}`, payload);
  }
  
  setState({
    activeModal: type,
    modalPayload: {
      ...state.modalPayload,
      [type]: payload,
    },
  });
};

const closeModal = () => {
  if (import.meta.env.DEV && state.activeModal) {
    console.log(`[UnifiedModal] Closing ${state.activeModal}`);
  }
  
  setState({ activeModal: null });
};

const closeAllModals = () => {
  if (import.meta.env.DEV) {
    console.log('[UnifiedModal] Closing all modals');
  }
  
  setState({ 
    activeModal: null, 
    modalPayload: {} 
  });
};

const isModalOpen = (type: ModalType): boolean => {
  return state.activeModal === type;
};

const getModalPayload = <T extends ModalType>(type: T): ModalPayload[T] | undefined => {
  return state.modalPayload[type];
};

state = {
  activeModal: null,
  modalPayload: {},
  openModal,
  closeModal,
  closeAllModals,
  isModalOpen,
  getModalPayload,
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type UnifiedModalSelector<T> = (state: UnifiedModalStore) => T;

type UseUnifiedModalStore = {
  <T>(selector: UnifiedModalSelector<T>): T;
  getState: () => UnifiedModalStore;
  setState: (partial: PartialState) => void;
  subscribe: (listener: () => void) => () => void;
};

const useUnifiedModalStoreBase = <T,>(selector: UnifiedModalSelector<T>): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const useUnifiedModalStore = useUnifiedModalStoreBase as UseUnifiedModalStore;

useUnifiedModalStore.getState = () => state;
useUnifiedModalStore.setState = setState;
useUnifiedModalStore.subscribe = subscribe;
