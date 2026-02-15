import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { LayoutBreakpoint } from '@/store/workspaceStore';

const MOBILE = 768;
const TABLET = 1024;
const DESKTOP_NARROW = 1280;

function getBreakpoint(): LayoutBreakpoint {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  if (w < MOBILE) return 'mobile';
  if (w < TABLET) return 'tablet';
  if (w < DESKTOP_NARROW) return 'desktop-narrow';
  return 'desktop-wide';
}

export function useWorkspaceLayout(): LayoutBreakpoint {
  const [breakpoint, setBreakpoint] = useState<LayoutBreakpoint>(
    () => getBreakpoint()
  );

  useEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${MOBILE - 1}px)`);
    const tablet = window.matchMedia(
      `(min-width: ${MOBILE}px) and (max-width: ${TABLET - 1}px)`
    );
    const desktopNarrow = window.matchMedia(
      `(min-width: ${TABLET}px) and (max-width: ${DESKTOP_NARROW - 1}px)`
    );
    const desktopWide = window.matchMedia(`(min-width: ${DESKTOP_NARROW}px)`);

    const update = () => {
      const bp = getBreakpoint();
      setBreakpoint(bp);
      useWorkspaceStore.getState().setLayoutBreakpoint(bp);
    };

    mobile.addEventListener('change', update);
    tablet.addEventListener('change', update);
    desktopNarrow.addEventListener('change', update);
    desktopWide.addEventListener('change', update);

    update();

    return () => {
      mobile.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
      desktopNarrow.removeEventListener('change', update);
      desktopWide.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}
