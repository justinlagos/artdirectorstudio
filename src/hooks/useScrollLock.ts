import { useEffect } from 'react';

/**
 * Centralized scroll lock manager
 * 
 * Tracks all modals/overlays that want to lock scroll and only locks
 * body scroll when at least one top-level modal is open.
 * 
 * Artie panel itself should NOT lock body scroll - only its internal content scrolls.
 */

type ScrollLockSource = string;

class ScrollLockManager {
  private locks = new Set<ScrollLockSource>();
  private savedStyles: {
    overflow: string;
    position: string;
    top: string;
    width: string;
    scrollY: number;
  } | null = null;

  /**
   * Request scroll lock for a source (e.g., 'modal', 'artie-modal', 'dialog')
   * Returns a cleanup function
   */
  lock(source: ScrollLockSource): () => void {
    this.locks.add(source);
    this.updateScrollLock();
    
    return () => {
      this.unlock(source);
    };
  }

  /**
   * Release scroll lock for a source
   */
  unlock(source: ScrollLockSource): void {
    this.locks.delete(source);
    this.updateScrollLock();
  }

  /**
   * Check if scroll is currently locked
   */
  isLocked(): boolean {
    return this.locks.size > 0;
  }

  /**
   * Update body scroll lock state based on active locks
   */
  private updateScrollLock(): void {
    const shouldLock = this.locks.size > 0;

    if (shouldLock && !this.savedStyles) {
      // Save current state and lock
      this.savedStyles = {
        overflow: document.body.style.overflow || '',
        position: document.body.style.position || '',
        top: document.body.style.top || '',
        width: document.body.style.width || '',
        scrollY: window.scrollY,
      };

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';

      if (import.meta.env.DEV) {
        console.log('[ScrollLock] Locked by:', Array.from(this.locks));
      }
    } else if (!shouldLock && this.savedStyles) {
      // Restore previous state
      document.body.style.overflow = this.savedStyles.overflow;
      document.body.style.position = this.savedStyles.position;
      document.body.style.top = this.savedStyles.top;
      document.body.style.width = this.savedStyles.width;

      // Restore scroll position
      window.scrollTo(0, this.savedStyles.scrollY);

      if (import.meta.env.DEV) {
        console.log('[ScrollLock] Unlocked, restored position:', this.savedStyles.scrollY);
      }

      this.savedStyles = null;
    }
  }

  /**
   * Force cleanup (for edge cases)
   */
  forceUnlock(): void {
    this.locks.clear();
    if (this.savedStyles) {
      document.body.style.overflow = this.savedStyles.overflow;
      document.body.style.position = this.savedStyles.position;
      document.body.style.top = this.savedStyles.top;
      document.body.style.width = this.savedStyles.width;
      window.scrollTo(0, this.savedStyles.scrollY);
      this.savedStyles = null;
    }
  }
}

// Singleton instance
const scrollLockManager = new ScrollLockManager();

/**
 * Hook to manage scroll locking for modals/overlays
 * 
 * @param isOpen - Whether the modal/overlay is open
 * @param source - Unique identifier for this lock source (e.g., 'artie-modal', 'dialog', 'edit-image')
 * @param shouldLock - Whether this source should lock scroll (default: true)
 * 
 * @example
 * ```tsx
 * // In a modal component
 * useScrollLock(isOpen, 'my-modal');
 * 
 * // In Artie panel (should NOT lock scroll)
 * useScrollLock(isOpen, 'artie-panel', false);
 * ```
 */
export function useScrollLock(
  isOpen: boolean,
  source: ScrollLockSource,
  shouldLock: boolean = true
): void {
  useEffect(() => {
    if (!shouldLock) return;

    if (isOpen) {
      return scrollLockManager.lock(source);
    } else {
      scrollLockManager.unlock(source);
    }
  }, [isOpen, source, shouldLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scrollLockManager.unlock(source);
    };
  }, [source]);
}

// Export manager for advanced use cases
export { scrollLockManager };

