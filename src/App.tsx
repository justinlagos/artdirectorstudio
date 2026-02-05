import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToolsModalProvider } from "@/contexts/ToolsModalContext";
import { LoadingState } from "@/components/LoadingState";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Sentry is loaded asynchronously in main.tsx, so we don't import it here
// This prevents blocking the app initialization
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load heavy components with error handling
const UnifiedToolsModal = lazy(() => 
  import("./components/UnifiedToolsModal")
    .then(m => ({ default: m.UnifiedToolsModal }))
    .catch(err => {
      console.error("Failed to load UnifiedToolsModal:", err);
      return { default: () => null };
    })
);
const ImageGenerationDialog = lazy(() => 
  import("./components/ImageGenerationDialog")
    .then(m => ({ default: m.ImageGenerationDialog }))
    .catch(err => {
      console.error("Failed to load ImageGenerationDialog:", err);
      return { default: () => null };
    })
);
const KeyboardShortcutsProvider = lazy(() => 
  import("./components/KeyboardShortcutsProvider")
    .then(m => ({ default: m.KeyboardShortcutsProvider }))
    .catch(err => {
      console.error("Failed to load KeyboardShortcutsProvider:", err);
      return { default: () => null };
    })
);

// Lazy load non-critical routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Community = lazy(() => import("./pages/Community"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Insights = lazy(() => import("./pages/Insights"));
const Settings = lazy(() => import("./pages/Settings"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const SharedAsset = lazy(() => import("./pages/SharedAsset"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const SubscriptionHistory = lazy(() => import("./pages/SubscriptionHistory"));
const BillingHistory = lazy(() => import("./pages/BillingHistory"));
const SignedOut = lazy(() => import("./pages/SignedOut"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PresetGallery = lazy(() => import("./pages/PresetGallery"));
const ArtiePage = lazy(() => import("./pages/ArtiePage"));
const DesignerProfile = lazy(() => import("./pages/DesignerProfile").then(m => ({ default: m.DesignerProfile })));
const Discover = lazy(() => import("./pages/Discover").then(m => ({ default: m.Discover })));
const CaseStudyDetail = lazy(() => import("./pages/CaseStudyDetail").then(m => ({ default: m.CaseStudyDetail })));

const TrialWelcomeToast = lazy(() => 
  import("./components/TrialWelcomeToast")
    .then(m => ({ default: m.TrialWelcomeToast }))
    .catch(err => {
      console.error("Failed to load TrialWelcomeToast:", err);
      return { default: () => null };
    })
);

// Configure QueryClient with aggressive caching for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data is fresh for 10 minutes
      gcTime: 60 * 60 * 1000, // 60 minutes - cache persists for 1 hour (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      retry: 1, // Retry failed requests once
      // Use structural sharing to prevent unnecessary re-renders
      structuralSharing: true,
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

// Component to track page views inside Router context
const PageViewTracker = () => {
  usePageViewTracking();
  return null;
};

// Sentry Error Boundary Fallback Component
const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center max-w-md space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
        </div>
        {import.meta.env.DEV && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-mono text-destructive break-all">{error.message}</p>
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  // Global escape handler to force close all Radix UI popper elements
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Force close all Radix UI popper elements (tooltips, dropdowns, popovers)
        document.querySelectorAll('[data-radix-popper-content-wrapper]').forEach(el => {
          const portal = el.closest('[data-radix-portal]');
          if (portal) {
            // Trigger escape on the content to properly close
            const content = el.querySelector('[role="tooltip"], [role="menu"], [role="dialog"]');
            if (content instanceof HTMLElement) {
              const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
              });
              content.dispatchEvent(escapeEvent);
            }
          }
        });
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider delayDuration={300}>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <PageViewTracker />
            <AuthProvider>
              <ToolsModalProvider>
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/community" element={<Community />} />
                <Route path="/gallery" element={<Navigate to="/community" replace />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/help" element={<Help />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/shared/:token" element={<SharedAsset />} />
                <Route path="/share/:slug" element={<SharedAsset />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/plans" element={<Subscriptions />} />
                <Route path="/subscription-history" element={<SubscriptionHistory />} />
                <Route path="/billing-history" element={<BillingHistory />} />
                  <Route path="/signed-out" element={<SignedOut />} />
                  <Route path="/presets" element={<PresetGallery />} />
                  <Route path="/artie" element={<ArtiePage />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/designer/:username" element={<DesignerProfile />} />
                  <Route path="/case-study/:id" element={<CaseStudyDetail />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <ErrorBoundary>
              <Suspense fallback={null}>
                <ImageGenerationDialog />
                <UnifiedToolsModal />
                <KeyboardShortcutsProvider />
              </Suspense>
            </ErrorBoundary>
            <BottomNav />
            <OnlineStatusIndicator />
            <ErrorBoundary>
              <Suspense fallback={null}>
                <TrialWelcomeToast />
              </Suspense>
            </ErrorBoundary>
              </ToolsModalProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

// For now, just export AppContent directly
// Sentry error boundary can be added later if needed, but it shouldn't block app initialization
// The app will work fine without it - errors will just be logged to console
const App = AppContent;

export default App;
