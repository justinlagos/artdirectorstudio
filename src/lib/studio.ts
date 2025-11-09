/**
 * Unified Studio Generation Flow
 * Opens the Generate in Studio modal with prefilled prompt and image across the entire app
 */

export interface OpenStudioOptions {
  basePrompt: string;
  imageUrl?: string;
  meta?: Record<string, any>;
}

/**
 * Opens the Studio generation modal with prefilled content
 * This function should be called from React components
 */
export function openStudioWithPrompt(options: OpenStudioOptions): void {
  const { basePrompt, imageUrl, meta } = options;

  // Dispatch custom event to trigger modal opening
  // This approach avoids direct store coupling and works across component boundaries
  const event = new CustomEvent('open-studio-generation', {
    detail: {
      prompt: basePrompt || '',
      imageUrl: imageUrl || null,
      meta: meta || {},
    },
  });

  window.dispatchEvent(event);

  // Ensure modal content is scrolled to top for CTA visibility
  requestAnimationFrame(() => {
    const modalBody = document.querySelector('[data-studio-modal-body]');
    if (modalBody) {
      modalBody.scrollTop = 0;
    }
  });
}

/**
 * Hook into this event listener to open the modal from any component
 * Example usage in a parent component:
 * 
 * useEffect(() => {
 *   const handleOpenStudio = (e: CustomEvent) => {
 *     setGenerationPrompt(e.detail.prompt);
 *     setReferenceImage(e.detail.imageUrl);
 *     setShowGenerationDialog(true);
 *   };
 *   
 *   window.addEventListener('open-studio-generation', handleOpenStudio);
 *   return () => window.removeEventListener('open-studio-generation', handleOpenStudio);
 * }, []);
 */
