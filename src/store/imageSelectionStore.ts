import { useSyncExternalStore } from "react";

export interface SelectedImage {
  id: string;
  url: string;
  prompt?: string;
  data?: any;
}

interface ImageSelectionState {
  selectedImage: SelectedImage | null;
  imageList: SelectedImage[];
  currentIndex: number;
  setSelectedImage: (image: SelectedImage | null) => void;
  setImageList: (images: SelectedImage[]) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectByIndex: (index: number) => void;
}

const listeners = new Set<() => void>();
let state: ImageSelectionState = {
  selectedImage: null,
  imageList: [],
  currentIndex: -1,
  setSelectedImage: () => {},
  setImageList: () => {},
  selectNext: () => {},
  selectPrevious: () => {},
  selectByIndex: () => {},
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partial: Partial<ImageSelectionState>) => {
  state = {
    ...state,
    ...partial,
  };
  notify();
};

const initialState: ImageSelectionState = {
  selectedImage: null,
  imageList: [],
  currentIndex: -1,
  setSelectedImage: (image: SelectedImage | null) => {
    const index = image
      ? state.imageList.findIndex((img) => img.id === image.id)
      : -1;
    setState({
      selectedImage: image,
      currentIndex: index,
    });
  },
  setImageList: (images: SelectedImage[]) => {
    // If current selected image is in new list, maintain selection
    const currentId = state.selectedImage?.id;
    const newIndex = currentId
      ? images.findIndex((img) => img.id === currentId)
      : -1;
    
    setState({
      imageList: images,
      currentIndex: newIndex >= 0 ? newIndex : -1,
      selectedImage: newIndex >= 0 ? images[newIndex] : null,
    });
  },
  selectNext: () => {
    if (state.imageList.length === 0) return;
    const nextIndex =
      state.currentIndex < state.imageList.length - 1
        ? state.currentIndex + 1
        : 0; // Wrap around
    setState({
      currentIndex: nextIndex,
      selectedImage: state.imageList[nextIndex],
    });
  },
  selectPrevious: () => {
    if (state.imageList.length === 0) return;
    const prevIndex =
      state.currentIndex > 0
        ? state.currentIndex - 1
        : state.imageList.length - 1; // Wrap around
    setState({
      currentIndex: prevIndex,
      selectedImage: state.imageList[prevIndex],
    });
  },
  selectByIndex: (index: number) => {
    if (index >= 0 && index < state.imageList.length) {
      setState({
        currentIndex: index,
        selectedImage: state.imageList[index],
      });
    }
  },
};

state = initialState;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type UseImageSelectionStore = {
  <T>(selector: (state: ImageSelectionState) => T): T;
  getState: () => ImageSelectionState;
  setState: (partial: Partial<ImageSelectionState>) => void;
  subscribe: (listener: () => void) => () => void;
};

const useImageSelectionStoreBase = <T,>(
  selector: (state: ImageSelectionState) => T
): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const useImageSelectionStore = useImageSelectionStoreBase as UseImageSelectionStore;

useImageSelectionStore.getState = () => state;
useImageSelectionStore.setState = setState;
useImageSelectionStore.subscribe = subscribe;
