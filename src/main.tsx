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

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please check the console for details.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}

// Register service worker for offline functionality
registerServiceWorker();
