import * as Sentry from "@sentry/react";

// Initialize Sentry only if DSN is provided - make it non-blocking
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
let sentryInitialized = false;

if (SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      environment: import.meta.env.MODE || "development",
      // Don't block page loads
      beforeSend(event, hint) {
        // Filter out non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          // Don't send network errors that are expected
          if (error instanceof TypeError && error.message.includes("fetch")) {
            return null;
          }
        }
        return event;
      },
    });
    sentryInitialized = true;
  } catch (error) {
    console.error("[Sentry] Failed to initialize:", error);
    // Continue without Sentry - don't block the app
  }
} else {
  console.log("[Sentry] DSN not provided, error tracking disabled");
}

// Export Sentry and initialization status
export { Sentry, sentryInitialized };

