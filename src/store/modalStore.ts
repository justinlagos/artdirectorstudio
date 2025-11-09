import { useSyncExternalStore } from "react";

type PartialState =
  | Partial<ModalStoreState>
  | ((state: ModalStoreState) => Partial<ModalStoreState>);

export interface ModalStoreState {
  isGenerateModalOpen: boolean;
  openGenerateModal: () => void;
  closeGenerateModal: () => void;
}

const listeners = new Set<() => void>();
let state: ModalStoreState;

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
  isGenerateModalOpen: false,
  openGenerateModal: () => setState({ isGenerateModalOpen: true }),
  closeGenerateModal: () => setState({ isGenerateModalOpen: false }),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type ModalSelector<T> = (state: ModalStoreState) => T;

type UseModalStore = {
  <T>(selector: ModalSelector<T>): T;
  getState: () => ModalStoreState;
  setState: (partial: PartialState) => void;
  subscribe: (listener: () => void) => () => void;
};

const useModalStoreBase = <T,>(selector: ModalSelector<T>): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const useModalStore = useModalStoreBase as UseModalStore;

useModalStore.getState = () => state;
useModalStore.setState = setState;
useModalStore.subscribe = subscribe;
