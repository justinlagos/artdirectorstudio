import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SubscriptionPricingTable } from "@/components/SubscriptionPricingTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Crown, Calendar, CreditCard, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading } = useSubscription();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {},
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open subscription management. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        {/* Current Plan Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Subscription Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your subscription plan and billing details
          </p>
        </div>

        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Current Plan</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : subscription.isPro ? (
                <Badge variant="default" className="text-sm px-3 py-1">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Free
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Plan:</span>
                  <span className="text-muted-foreground">
                    {subscription.tier || 'Free'}
                  </span>
                </div>

                {subscription.expiresAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Renews:</span>
                    <span className="text-muted-foreground">
                      {new Date(subscription.expiresAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                <Separator />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {subscription.isPro && (
                    <Button 
                      onClick={handleManageSubscription}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Manage Subscription
                    </Button>
                  )}
                  <Link to="/subscription-history" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full">
                      <Receipt className="w-4 h-4 mr-2" />
                      View Billing History
                    </Button>
                  </Link>
                </div>
                
                {subscription.isPro && (
                  <p className="text-xs text-muted-foreground">
                    Update payment method, cancel, or change your plan
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">
              {subscription.isPro ? 'Change Plan' : 'Upgrade Your Plan'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {subscription.isPro 
                ? 'Switch to a different plan that fits your needs'
                : 'Unlock unlimited features and advanced capabilities'
              }
            </p>
          </div>

          <SubscriptionPricingTable />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscriptions;
