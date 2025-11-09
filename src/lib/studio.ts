import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";

export interface OpenStudioOptions {
  basePrompt: string;
  imageUrl?: string;
  meta?: Record<string, unknown>;
}

export function openStudioWithPrompt({
  basePrompt,
  imageUrl,
  meta,
}: OpenStudioOptions): void {
  const studioState = useStudioStore.getState();
  const modalState = useModalStore.getState();

  studioState.setPrompt(basePrompt || "");
  studioState.setImage(imageUrl || "");
  if (meta) {
    studioState.setMeta(meta);
  } else {
    studioState.setMeta(undefined);
  }

  modalState.openGenerateModal();

  requestAnimationFrame(() => {
    const modalBody = document.querySelector<HTMLElement>(".studio-modal-body");
    if (modalBody) {
      modalBody.scrollTop = 0;
    }
  });
}

export function closeStudioModal(): void {
  const modalState = useModalStore.getState();
  const studioState = useStudioStore.getState();
  modalState.closeGenerateModal();
  studioState.reset();
}
