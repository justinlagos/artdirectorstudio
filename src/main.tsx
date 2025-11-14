import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";

// Initialize Sentry asynchronously to prevent blocking
// Use setTimeout to ensure it doesn't block the main thread
setTimeout(() => {
  import("./lib/sentry").catch(() => {
    // Silently fail - Sentry is not critical for app functionality
  });
}, 0);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Register service worker for offline functionality
registerServiceWorker();
