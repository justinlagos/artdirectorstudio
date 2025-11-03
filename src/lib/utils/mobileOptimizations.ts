/**
 * Mobile optimization utilities for better UX on mobile devices
 */

/**
 * Prevent viewport scaling when input is focused (iOS)
 */
export function preventViewportZoom() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const content = viewport.getAttribute('content');
    if (!content?.includes('maximum-scale=1')) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }
  }
}

/**
 * Restore viewport zooming
 */
export function restoreViewportZoom() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1'
    );
  }
}

/**
 * Scroll element into view with padding
 */
export function scrollIntoViewWithPadding(element: HTMLElement, padding: number = 20) {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const targetY = rect.top + scrollTop - padding;
  
  window.scrollTo({
    top: targetY,
    behavior: 'smooth'
  });
}

/**
 * Handle keyboard appearance on iOS
 */
export function handleMobileKeyboard() {
  let originalHeight = window.innerHeight;
  
  const handleResize = () => {
    const currentHeight = window.innerHeight;
    const heightDiff = originalHeight - currentHeight;
    
    // Keyboard is likely visible if height decreased significantly
    if (heightDiff > 150) {
      // Scroll active input into view
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA'
      )) {
        setTimeout(() => {
          scrollIntoViewWithPadding(activeElement, 100);
        }, 300);
      }
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

/**
 * Handle touch feedback
 */
export function addTouchFeedback(element: HTMLElement) {
  element.addEventListener('touchstart', () => {
    element.style.opacity = '0.7';
  });
  
  element.addEventListener('touchend', () => {
    element.style.opacity = '1';
  });
  
  element.addEventListener('touchcancel', () => {
    element.style.opacity = '1';
  });
}

/**
 * Prevent pull-to-refresh on mobile
 */
export function preventPullToRefresh() {
  let startY = 0;
  
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].pageY;
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    const y = e.touches[0].pageY;
    // Prevent pull-to-refresh if scrolling down when at top
    if (y > startY && window.scrollY === 0) {
      e.preventDefault();
    }
  }, { passive: false });
}

/**
 * Optimize image loading for mobile
 */
export function optimizeImageForMobile(file: File, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small, return as-is
    if (file.size < 500000) { // 500KB
      resolve(file);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
