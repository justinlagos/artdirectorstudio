import { useEffect } from 'react';

/**
 * Centralized scroll lock manager
 * 
 * Tracks all modals/overlays that want to lock scroll and only locks
 * body scroll when at least one top-level modal is open.
 * 
 * Artie panel itself should NOT lock body scroll - only its internal content scrolls.
 * 
 * IMPORTANT: Only applies padding compensation if scrollbar-gutter is NOT supported.
 * Double compensation is a bug.
 */

type ScrollLockSource = string;

/**
 * Check if browser supports scrollbar-gutter CSS property
 */
const supportsScrollbarGutter = (): boolean =>
  typeof CSS !== 'undefined' && (CSS.supports?.('scrollbar-gutter', 'stable') ?? false);

/**
 * Get the width of the scrollbar in pixels
 */
const getScrollbarWidth = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }
  
  // Create a temporary element to measure scrollbar width
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.msOverflowStyle = 'scrollbar';
  document.body.appendChild(outer);
  
  const inner = document.createElement('div');
  outer.appendChild(inner);
  
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  
  outer.parentNode?.removeChild(outer);
  
  return scrollbarWidth;
};

class ScrollLockManager {
  private locks = new Set<ScrollLockSource>();
  private savedStyles: {
    overflow: string;
    position: string;
    top: string;
    width: string;
    height: string;
    overscrollBehavior: string;
    paddingRight: string;
    scrollY: number;
  } | null = null;

  /**
   * Request scroll lock for a source (e.g., 'modal', 'artie-modal', 'dialog')
   * Returns a cleanup function
   */
  lock(source: ScrollLockSource): () => void {
    if (import.meta.env.DEV) {
      console.log(`[ScrollLock] Lock requested by: ${source}`, {
        currentLocks: Array.from(this.locks),
        isLocked: this.isLocked()
      });
    }
    
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
    if (import.meta.env.DEV) {
      console.log(`[ScrollLock] Unlock requested by: ${source}`, {
        currentLocks: Array.from(this.locks),
        isLocked: this.isLocked()
      });
    }
    
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
   * Get current state for debugging
   */
  getState() {
    return {
      activeLocks: Array.from(this.locks),
      isLocked: this.isLocked(),
      lockCount: this.locks.size
    };
  }

  /**
   * Update body scroll lock state based on active locks
   */
  private updateScrollLock(): void {
    const shouldLock = this.locks.size > 0;
    const hasScrollbarGutter = supportsScrollbarGutter();

    if (shouldLock && !this.savedStyles) {
      // Save current state and lock
      this.savedStyles = {
        overflow: document.body.style.overflow || '',
        position: document.body.style.position || '',
        top: document.body.style.top || '',
        width: document.body.style.width || '',
        height: document.body.style.height || '',
        overscrollBehavior: document.body.style.overscrollBehavior || '',
        paddingRight: document.body.style.paddingRight || '',
        scrollY: window.scrollY,
      };

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
      // Fix for iOS Safari - prevent bounce scroll
      document.body.style.height = '100%';
      document.body.style.overscrollBehavior = 'none';
      // Fix for Android Chrome
      if (window.innerHeight) {
        document.body.style.height = `${window.innerHeight}px`;
      }

      // Only apply padding compensation if scrollbar-gutter is NOT supported
      // Double compensation is a bug
      if (!hasScrollbarGutter) {
        const scrollbarWidth = getScrollbarWidth();
        if (scrollbarWidth > 0) {
          const currentPaddingRight = parseFloat(
            window.getComputedStyle(document.body).paddingRight
          ) || 0;
          document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
        }
      }

      if (import.meta.env.DEV) {
        console.log('[ScrollLock] Locked by:', Array.from(this.locks), {
          hasScrollbarGutter,
          appliedPaddingCompensation: !hasScrollbarGutter
        });
      }
    } else if (!shouldLock && this.savedStyles) {
      // Restore previous state
      document.body.style.overflow = this.savedStyles.overflow;
      document.body.style.position = this.savedStyles.position;
      document.body.style.top = this.savedStyles.top;
      document.body.style.width = this.savedStyles.width;
      document.body.style.height = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.paddingRight = this.savedStyles.paddingRight;

      // Restore scroll position
      window.scrollTo(0, this.savedStyles.scrollY);

      if (import.meta.env.DEV) {
        console.log('[ScrollLock] Unlocked, restored position:', this.savedStyles.scrollY);
      }

      this.savedStyles = null;
    }
  }

  /**
   * Force cleanup (for edge cases and error recovery)
   */
  forceUnlock(): void {
    console.warn('[ScrollLock] Force unlock all - recovering from error state');
    this.locks.clear();
    if (this.savedStyles) {
      document.body.style.overflow = this.savedStyles.overflow;
      document.body.style.position = this.savedStyles.position;
      document.body.style.top = this.savedStyles.top;
      document.body.style.width = this.savedStyles.width;
      document.body.style.height = this.savedStyles.height;
      document.body.style.overscrollBehavior = this.savedStyles.overscrollBehavior;
      document.body.style.paddingRight = this.savedStyles.paddingRight;
      window.scrollTo(0, this.savedStyles.scrollY);
      this.savedStyles = null;
    }
  }
}

// Safety: Global error handler to recover from scroll lock issues
if (typeof window !== 'undefined') {
  window.addEventListener('error', () => {
    // If critical error and too many locks, force unlock
    setTimeout(() => {
      const manager = scrollLockManager;
      if (manager.getState().lockCount > 3) {
        manager.forceUnlock();
      }
    }, 1000);
  });
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
    // Only lock when explicitly requested
    if (!shouldLock || !isOpen) {
      return;
    }

    // Lock and return cleanup function consistently
    return scrollLockManager.lock(source);
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

