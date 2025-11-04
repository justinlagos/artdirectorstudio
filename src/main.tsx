import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnvironment } from "./lib/config/environmentValidator";

// Validate environment at boot
try {
  validateEnvironment();
} catch (error) {
  console.error("Environment validation failed:", error);
  // Show user-friendly error in production
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; background: #0a0a0a; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 600px; text-align: center;">
        <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ef4444;">Configuration Error</h1>
        <p style="margin-bottom: 2rem; color: #9ca3af;">The application is not properly configured. Please contact support.</p>
        <details style="text-align: left; background: #1a1a1a; padding: 1rem; border-radius: 0.5rem;">
          <summary style="cursor: pointer; color: #60a5fa;">Technical Details</summary>
          <pre style="margin-top: 1rem; white-space: pre-wrap; font-size: 0.875rem; color: #d1d5db;">${error instanceof Error ? error.message : 'Unknown error'}</pre>
        </details>
      </div>
    </div>
  `;
  throw error;
}

createRoot(document.getElementById("root")!).render(<App />);
