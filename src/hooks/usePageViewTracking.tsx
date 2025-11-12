import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const trackPageView = async () => {
      const sessionId = getSessionId();
      const deviceInfo = getDeviceInfo();
      const utmParams = getUtmParams();
      
      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase.from('page_views').insert({
        session_id: sessionId,
        user_id: user?.id || null,
        page_path: location.pathname,
        page_title: document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        ...deviceInfo,
        ...utmParams
      }).select('id').single();

      if (data) {
        currentPageId.current = data.id;
      }

      pageLoadTime.current = Date.now();
    };

    trackPageView();

    // Track time on page when leaving
    return () => {
      if (currentPageId.current) {
        const timeOnPage = Math.round((Date.now() - pageLoadTime.current) / 1000);
        supabase.from('page_views').update({
          time_on_page: timeOnPage,
          is_bounce: timeOnPage < 5
        }).eq('id', currentPageId.current).then();
      }
    };
  }, [location]);
}
