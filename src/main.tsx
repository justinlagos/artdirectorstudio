import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorker";
import { initPerformanceMonitoring } from "./lib/performanceMonitoring";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline functionality
registerServiceWorker();

// Initialize performance monitoring
initPerformanceMonitoring();
