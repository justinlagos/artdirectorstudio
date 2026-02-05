import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from './useUserPreferences';
import { useModalStore } from '@/store/modalStore';
import { useToolsModal } from '@/contexts/ToolsModalContext';
import { openStudioWithPrompt } from '@/lib/studio';
import { toast } from 'sonner';

/**
 * Global keyboard shortcuts hook
 * Only active when keyboard shortcuts are enabled in user preferences
 */
export function useGlobalKeyboardShortcuts() {
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  const { openTool } = useToolsModal();
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);
  
  const isEnabled = preferences.keyboardShortcuts === 'enabled';

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when user is typing
      const target = event.target as HTMLElement;
      const isTyping = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      // Allow Escape and ? to work everywhere
      if (event.key !== 'Escape' && event.key !== '?' && isTyping) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except for specific shortcuts)
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        // Only handle ? with Shift for shortcuts overlay
        if (event.shiftKey && event.key === '?') {
          event.preventDefault();
          setShowShortcutsOverlay(true);
        }
        return;
      }

      // Handle single key shortcuts
      switch (event.key.toLowerCase()) {
        case 'e':
          // Edit selected image (if image is selected)
          // TODO: Implement image selection state
          event.preventDefault();
          openTool('edit');
          break;

        case 'u':
          // Upscale selected image
          event.preventDefault();
          openTool('upscale');
          break;

        case 'b':
          // Blend selected images
          event.preventDefault();
          openTool('blend');
          break;

        case 'g':
          // Generate new image (opens studio modal)
          event.preventDefault();
          openStudioWithPrompt({
            basePrompt: '',
            meta: { source: 'keyboard-shortcut' },
          });
          break;

        case 'a':
          // Toggle Artie chat
          event.preventDefault();
          navigate('/artie');
          break;

        case 'j': {
          // Navigate to next image (if in gallery)
          event.preventDefault();
          import('@/store/imageSelectionStore').then(({ useImageSelectionStore }) => {
            const imageStore = useImageSelectionStore.getState();
            if (imageStore.imageList.length > 0) {
              imageStore.selectNext();
              const selected = imageStore.selectedImage;
              if (selected) {
                window.dispatchEvent(new CustomEvent('image-selected', { detail: selected }));
                toast.success(`Image ${imageStore.currentIndex + 1} of ${imageStore.imageList.length}`);
              }
            } else {
              toast.info('No images available to navigate');
            }
          });
          break;
        }

        case 'k': {
          // Navigate to previous image (if in gallery)
          event.preventDefault();
          import('@/store/imageSelectionStore').then(({ useImageSelectionStore }) => {
            const imgStore = useImageSelectionStore.getState();
            if (imgStore.imageList.length > 0) {
              imgStore.selectPrevious();
              const selected = imgStore.selectedImage;
              if (selected) {
                window.dispatchEvent(new CustomEvent('image-selected', { detail: selected }));
                toast.success(`Image ${imgStore.currentIndex + 1} of ${imgStore.imageList.length}`);
              }
            } else {
              toast.info('No images available to navigate');
            }
          });
          break;
        }

        case '?':
          // Show shortcuts overlay
          event.preventDefault();
          setShowShortcutsOverlay(true);
          break;

        case 'escape':
          // Close modal (handled by Radix UI, but we can add custom logic)
          // Most modals handle this automatically
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled, navigate, openTool]);

  return {
    showShortcutsOverlay,
    setShowShortcutsOverlay,
  };
}
