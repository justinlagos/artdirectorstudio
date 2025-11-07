import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Admin from "./pages/Admin";
import Inspire from "./pages/Inspire";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import SharedAsset from "./pages/SharedAsset";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Subscriptions from "./pages/Subscriptions";
import SubscriptionHistory from "./pages/SubscriptionHistory";
import BillingHistory from "./pages/BillingHistory";
import SignedOut from "./pages/SignedOut";
import NotFound from "./pages/NotFound";
import { ArtieChat } from "./components/ArtieChat";
import { TrialWelcomeToast } from "./components/TrialWelcomeToast";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              <Route path="/history" element={<History />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/inspire" element={<Inspire />} />
              <Route path="/gallery" element={<Inspire />} />
              <Route path="/analytics" element={<Analytics />} />
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
          <Route path="/subscription-history" element={<SubscriptionHistory />} />
          <Route path="/billing-history" element={<BillingHistory />} />
              <Route path="/signed-out" element={<SignedOut />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ArtieChat />
            <TrialWelcomeToast />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
