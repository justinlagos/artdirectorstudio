import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToolsModalProvider } from "@/contexts/ToolsModalContext";
import { UnifiedToolsModal } from "@/components/UnifiedToolsModal";
import { ImageGenerationDialog } from "@/components/ImageGenerationDialog";
import { LoadingState } from "@/components/LoadingState";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import { BottomNav } from "@/components/BottomNav";
import { GlobalKeyboardShortcuts } from "@/components/GlobalKeyboardShortcuts";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const Admin = lazy(() => import("./pages/Admin"));
const Inspire = lazy(() => import("./pages/Inspire"));
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

// Lazy load heavy components
const ArtieChat = lazy(() => import("./components/ArtieChat").then(m => ({ default: m.ArtieChat })));
const TrialWelcomeToast = lazy(() => import("./components/TrialWelcomeToast").then(m => ({ default: m.TrialWelcomeToast })));

// Configure QueryClient with increased cache TTL and better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes - cache persists for 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
      retry: 1, // Retry failed requests once
    },
  },
});

// Component to track page views inside Router context
const PageViewTracker = () => {
  usePageViewTracking();
  return null;
};

const App = () => {
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
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageViewTracker />
          <AuthProvider>
            <GlobalKeyboardShortcuts />
            <ToolsModalProvider>
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/history" element={<History />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/inspire" element={<Inspire />} />
                <Route path="/gallery" element={<Inspire />} />
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <ImageGenerationDialog />
            <UnifiedToolsModal />
            <BottomNav />
            <OnlineStatusIndicator />
            <Suspense fallback={null}>
              <ArtieChat />
              <TrialWelcomeToast />
            </Suspense>
            </ToolsModalProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
