import { useEffect, useState, useRef, RefObject } from 'react';

export const useScrollFade = (scrollContainerRef: RefObject<HTMLDivElement>) => {
  const [showBottomFade, setShowBottomFade] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrollable = scrollHeight > clientHeight;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold
      
      setShowBottomFade(isScrollable && !isAtBottom);
    };

    // Initial check
    checkScroll();

    // Check on scroll
    container.addEventListener('scroll', checkScroll);
    
    // Check on resize (for when content changes)
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [scrollContainerRef]);

  return showBottomFade;
};
