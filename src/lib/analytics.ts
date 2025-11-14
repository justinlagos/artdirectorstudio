import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

// Initialize Mixpanel only if token is provided
if (MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false, // We'll track pageviews manually
    persistence: "localStorage",
    ignore_dnt: false, // Respect Do Not Track
  });
} else {
  console.log("[Analytics] Mixpanel token not provided, analytics disabled");
}

interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export const analytics = {
  /**
   * Track an event
   * @param eventName - Name of the event
   * @param properties - Event properties (no user text content)
   */
  track: (eventName: string, properties?: AnalyticsProperties) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      // Sanitize properties - remove any text content
      const sanitizedProperties = properties
        ? Object.fromEntries(
            Object.entries(properties).filter(([key, value]) => {
              // Only allow metadata, not user text content
              const allowedKeys = [
                "tool",
                "action",
                "type",
                "has_reference",
                "prompt_length",
                "image_count",
                "target_size",
                "duration_ms",
                "asset_id",
                "subscription_tier",
                "credits",
                "error_type",
                "success",
                "asset_type",
                "is_public",
                "asset_count",
                "success_count",
                "error_count",
              ];
              // Allow if key is in allowed list AND (not a string OR short string like IDs)
              return allowedKeys.includes(key) && (typeof value !== "string" || value.length < 50);
            })
          )
        : undefined;

      mixpanel.track(eventName, sanitizedProperties);
    } catch (error) {
      console.error("[Analytics] Error tracking event:", error);
    }
  },

  /**
   * Identify a user
   * @param userId - User ID
   */
  identify: (userId: string) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.identify(userId);
    } catch (error) {
      console.error("[Analytics] Error identifying user:", error);
    }
  },

  /**
   * Set user properties
   * @param properties - User properties (no sensitive data)
   */
  setUserProperties: (properties: AnalyticsProperties) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      // Only set allowed properties
      const allowedProperties = Object.fromEntries(
        Object.entries(properties).filter(([key]) => {
          const allowedKeys = [
            "subscription_tier",
            "credits",
            "email_domain", // Only domain, not full email
            "created_at",
          ];
          return allowedKeys.includes(key);
        })
      );

      mixpanel.people.set(allowedProperties);
    } catch (error) {
      console.error("[Analytics] Error setting user properties:", error);
    }
  },

  /**
   * Track page view
   * @param pageName - Name of the page
   */
  trackPageView: (pageName: string) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.track("Page View", { page: pageName });
    } catch (error) {
      console.error("[Analytics] Error tracking page view:", error);
    }
  },

  /**
   * Reset user identity (on logout)
   */
  reset: () => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.reset();
    } catch (error) {
      console.error("[Analytics] Error resetting analytics:", error);
    }
  },
};

