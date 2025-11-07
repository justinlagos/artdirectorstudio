import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { UserAnalytics } from "@/components/UserAnalytics";
import { 
  Crown, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Zap,
  ArrowRight,
  Clock,
  ImageIcon,
  History as HistoryIcon
} from "lucide-react";
import { toast } from "sonner";

const Insights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, loading: subLoading } = useSubscription();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileResult, assetsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single(),
        supabase
          .from('generated_assets')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(6)
      ]);
      
      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);
      setRecentAssets(assetsResult.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load insights data");
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = () => {
    const tier = subscription.tier || 'free';
    const tiers: Record<string, { name: string; color: string; gradient: string }> = {
      free: { 
        name: 'Free Trial', 
        color: 'text-muted-foreground',
        gradient: 'from-gray-500/20 to-gray-500/5'
      },
      starter: { 
        name: 'Starter', 
        color: 'text-blue-500',
        gradient: 'from-blue-500/20 to-blue-500/5'
      },
      pro: { 
        name: 'Pro', 
        color: 'text-primary',
        gradient: 'from-primary/20 to-primary/5'
      },
      enterprise: { 
        name: 'Enterprise', 
        color: 'text-purple-500',
        gradient: 'from-purple-500/20 to-purple-500/5'
      },
    };
    return tiers[tier] || tiers.free;
  };

  const getDaysUntilRenewal = () => {
    if (!subscription.expiresAt) return null;
    const now = new Date();
    const expiry = new Date(subscription.expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUsagePercentage = () => {
    if (!profile || subscription.tier !== 'starter') return 0;
    return (profile.daily_usage / profile.daily_limit) * 100;
  };

  const getResetTime = () => {
    if (!profile?.daily_usage_reset_at) return 'midnight';
    const resetDate = new Date(profile.daily_usage_reset_at);
    return resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-1">
        <Header />
        <main className="flex-1 container mx-auto px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-48 bg-muted rounded-lg"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tierInfo = getTierInfo();
  const daysUntilRenewal = getDaysUntilRenewal();
  const usagePercentage = getUsagePercentage();

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Insights</h1>
            <p className="text-muted-foreground">Track your usage, subscription, and activity insights</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Current Plan Card */}
                <Card className={`glass border-2 bg-gradient-to-br ${tierInfo.gradient}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Current Plan</CardTitle>
                      <Crown className={`w-5 h-5 ${tierInfo.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className={`text-3xl font-bold ${tierInfo.color}`}>{tierInfo.name}</p>
                      {subscription.tier === 'free' && (
                        <p className="text-sm text-muted-foreground">
                          {profile?.free_credits || 0} free credits remaining
                        </p>
                      )}
                      {subscription.tier !== 'free' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/plans')}
                          className="w-full mt-2"
                        >
                          Manage Plan
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Usage Card (Starter only) */}
                {subscription.tier === 'starter' && (
                  <Card className="glass">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Daily Usage</CardTitle>
                        <Zap className="w-5 h-5 text-yellow-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-2xl font-bold">
                              {profile?.daily_usage || 0}/{profile?.daily_limit || 10}
                            </span>
                            <span className="text-sm text-muted-foreground">generations</span>
                          </div>
                          <Progress value={usagePercentage} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Resets at {getResetTime()}</span>
                        </div>
                        {usagePercentage >= 80 && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => navigate('/plans')}
                            className="w-full"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Upgrade for Unlimited
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unlimited Usage Card (Pro/Enterprise) */}
                {(subscription.tier === 'pro' || subscription.tier === 'enterprise') && (
                  <Card className="glass border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Daily Usage</CardTitle>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-green-500">Unlimited</p>
                        <p className="text-sm text-muted-foreground">
                          Generate as many images as you need
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Renewal Card */}
                {subscription.tier !== 'free' && daysUntilRenewal !== null && (
                  <Card className="glass">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Next Renewal</CardTitle>
                        <Calendar className="w-5 h-5 text-blue-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold">
                          {daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(subscription.expiresAt!).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recent Items */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Creations</CardTitle>
                      <CardDescription>Your latest generated images</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentAssets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {recentAssets.map((asset) => (
                        <div key={asset.id} className="aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                          {asset.image_url ? (
                            <img 
                              src={asset.image_url} 
                              alt="Generated asset" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No creations yet. Start generating!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Get started with your creative work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-start gap-2"
                      onClick={() => navigate('/')}
                    >
                      <Sparkles className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-semibold">Generate Image</p>
                        <p className="text-xs text-muted-foreground">Create AI artwork</p>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-start gap-2"
                      onClick={() => navigate('/history')}
                    >
                      <HistoryIcon className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-semibold">View Projects</p>
                        <p className="text-xs text-muted-foreground">Past generations</p>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-start gap-2"
                      onClick={() => navigate('/inspire')}
                    >
                      <Sparkles className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-semibold">Explore Inspire</p>
                        <p className="text-xs text-muted-foreground">Community art</p>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col items-start gap-2"
                      onClick={() => navigate('/settings')}
                    >
                      <Crown className="w-5 h-5" />
                      <div className="text-left">
                        <p className="font-semibold">Settings</p>
                        <p className="text-xs text-muted-foreground">Manage account</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Upgrade CTA for Free/Starter users */}
              {(subscription.tier === 'free' || subscription.tier === 'starter') && (
                <Card className="glass border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-6 h-6 text-primary" />
                      Unlock Full Potential
                    </CardTitle>
                    <CardDescription>
                      {subscription.tier === 'free' 
                        ? 'Get unlimited generations and advanced features'
                        : 'Upgrade to Pro for unlimited daily generations'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        size="lg"
                        onClick={() => navigate('/plans')}
                        className="flex-1"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {subscription.tier === 'free' ? 'View Plans' : 'Upgrade to Pro'}
                      </Button>
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/inspire')}
                        className="flex-1"
                      >
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <UserAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Insights;
