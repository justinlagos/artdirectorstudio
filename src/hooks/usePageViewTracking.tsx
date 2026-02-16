import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PAGE_VIEW_TRACKING_BACKOFF_KEY = 'page_view_tracking_disabled_until';
const PAGE_VIEW_TRACKING_BACKOFF_MS = 5 * 60 * 1000;

function isPageViewTrackingBackedOff() {
  if (typeof window === 'undefined') return false;
  const disabledUntilRaw = sessionStorage.getItem(PAGE_VIEW_TRACKING_BACKOFF_KEY);
  const disabledUntil = disabledUntilRaw ? Number(disabledUntilRaw) : 0;
  return Number.isFinite(disabledUntil) && disabledUntil > Date.now();
}

function setPageViewTrackingBackoff() {
  if (typeof window === 'undefined') return;
  const disabledUntil = Date.now() + PAGE_VIEW_TRACKING_BACKOFF_MS;
  sessionStorage.setItem(PAGE_VIEW_TRACKING_BACKOFF_KEY, String(disabledUntil));
}

// Get or create session ID
function getSessionId() {
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
}

// Parse user agent for device info
function getDeviceInfo() {
  const ua = navigator.userAgent;
  return {
    device_type: /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop',
    browser: ua.match(/(?:Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || 'Unknown',
    os: ua.match(/(?:Windows|Mac|Linux|Android|iOS)/)?.[0] || 'Unknown',
    screen_resolution: `${screen.width}x${screen.height}`
  };
}

// Parse UTM parameters
function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign')
  };
}

export function usePageViewTracking() {
  const location = useLocation();
  const pageLoadTime = useRef(Date.now());
  const currentPageId = useRef<string | null>(null);
  const shouldTrackPageViews =
    import.meta.env.PROD || import.meta.env.VITE_ENABLE_PAGE_VIEW_TRACKING === 'true';

  useEffect(() => {
    if (!shouldTrackPageViews || isPageViewTrackingBackedOff()) return;

    const trackPageView = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          const message = sessionError.message?.toLowerCase() ?? '';
          if (message.includes('refresh token')) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          }
          return;
        }

        // Avoid noisy 401s in environments where anonymous page tracking is not allowed by RLS.
        const userId = session?.user?.id;
        if (!userId) return;

        const sessionId = getSessionId();
        const deviceInfo = getDeviceInfo();
        const utmParams = getUtmParams();

        const { data, error } = await supabase
          .from('page_views')
          .insert({
            session_id: sessionId,
            user_id: userId,
            page_path: location.pathname,
            page_title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            ...deviceInfo,
            ...utmParams,
          })
          .select('id')
          .single();

        if (error || !data) {
          setPageViewTrackingBackoff();
          return;
        }

        currentPageId.current = data.id;
        pageLoadTime.current = Date.now();
      } catch {
        setPageViewTrackingBackoff();
        // Analytics tracking is non-critical: fail silently.
      }
    };

    trackPageView();

    // Track time on page when leaving
    return () => {
      if (currentPageId.current) {
        const timeOnPage = Math.round((Date.now() - pageLoadTime.current) / 1000);
        supabase
          .from('page_views')
          .update({
            time_on_page: timeOnPage,
            is_bounce: timeOnPage < 5
          })
          .eq('id', currentPageId.current)
          .then(() => undefined);
      }
    };
  }, [location, shouldTrackPageViews]);
}
