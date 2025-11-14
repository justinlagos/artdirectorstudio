import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
// Initialize Sentry early (before app renders)
import "./lib/sentry";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Register service worker for offline functionality
registerServiceWorker();
