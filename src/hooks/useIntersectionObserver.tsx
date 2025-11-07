import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

/**
 * Custom hook for intersection observer
 * Detects when an element enters the viewport
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [RefObject<HTMLDivElement>, boolean] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '50px', // Start loading 50px before entering viewport
    freezeOnceVisible = false,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already visible and we want to freeze, don't observe
    if (freezeOnceVisible && isIntersecting) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        // If element is visible and we want to freeze, unobserve
        if (isElementIntersecting && freezeOnceVisible) {
          observer.unobserve(element);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, root, rootMargin, freezeOnceVisible, isIntersecting]);

  return [elementRef, isIntersecting];
}

/**
 * Hook specifically for lazy loading images
 */
export function useLazyLoad(options: UseIntersectionObserverOptions = {}) {
  return useIntersectionObserver({
    rootMargin: '100px', // Start loading 100px before entering viewport
    freezeOnceVisible: true, // Once loaded, don't observe anymore
    ...options,
  });
}
